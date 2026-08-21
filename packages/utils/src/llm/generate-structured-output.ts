import {
  extractJsonMiddleware,
  generateText,
  NoObjectGeneratedError,
  Output,
  wrapLanguageModel,
} from "ai";
import { logger } from "../logger";
import { structuredOutputJsonPrompt, structuredOutputRepairPrompt } from "../prompt";
import { extractLastJson } from "../utils/extract-last-json";
import { getLangfuseTelemetry } from "./langfuse-telemetry";
import { getFlashModel } from "./models";

type GenerateTextOptions = Parameters<typeof generateText>[0];
type GenerateTextResult = Awaited<ReturnType<typeof generateText>>;
type StructuredOutputResultContext = Pick<
  GenerateTextResult,
  "response" | "usage" | "finishReason"
>;
type StructuredOutput = {
  responseFormat: PromiseLike<unknown>;
  parseCompleteOutput: (
    options: { text: string },
    context: StructuredOutputResultContext,
  ) => Promise<unknown>;
};
type StructuredOutputValue<OUTPUT extends StructuredOutput> = Awaited<
  ReturnType<OUTPUT["parseCompleteOutput"]>
>;

/**
 * 专门用于生成结构化 JSON。
 * 它会把 output 里的 JSON Schema 注入 instructions，
 * 再复用 output 自带的解析逻辑完成最终校验。
 */
export async function generateStructuredOutput<OUTPUT extends StructuredOutput>(
  options: Omit<GenerateTextOptions, "output" | "experimental_output" | "system"> & {
    output: OUTPUT;
  },
): Promise<
  Omit<GenerateTextResult, "output" | "experimental_output"> & {
    output: StructuredOutputValue<OUTPUT>;
    experimental_output: StructuredOutputValue<OUTPUT>;
  }
> {
  const responseFormat = await options.output.responseFormat;
  if (
    responseFormat == null ||
    typeof responseFormat !== "object" ||
    !("type" in responseFormat) ||
    responseFormat.type !== "json" ||
    !("schema" in responseFormat) ||
    responseFormat.schema == null
  ) {
    throw new Error("generateStructuredOutput 只支持携带 JSON Schema 的结构化 output。");
  }

  if (options.instructions != null && typeof options.instructions !== "string") {
    throw new Error("generateStructuredOutput 当前只支持 string 类型的 instructions。");
  }

  const instructions = [
    options.instructions,
    structuredOutputJsonPrompt,
    JSON.stringify(responseFormat.schema),
  ].join("\n");

  try {
    const result = await generateText({
      ...options,
      model: wrapLanguageModel({
        model: options.model as Exclude<GenerateTextOptions["model"], string>,
        middleware: extractJsonMiddleware({
          transform: (text) => extractLastJson(text) ?? text.trim(),
        }),
      }),
      instructions,
      output: Output.json(),
      telemetry: getLangfuseTelemetry(),
    } as Parameters<typeof generateText>[0]);

    const output = (await options.output.parseCompleteOutput(
      { text: result.text },
      {
        response: result.finalStep.response,
        usage: result.usage,
        finishReason: result.finishReason,
      },
    )) as StructuredOutputValue<OUTPUT>;

    return { ...result, output, experimental_output: output };
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) {
      throw error;
    }

    logger.warn("[llm.structured-output] 未生成可解析 JSON，尝试修正", error.text);

    if (error.text == null) {
      throw error;
    }

    const repairResult = await generateText({
      model: wrapLanguageModel({
        model: getFlashModel(),
        middleware: extractJsonMiddleware({
          transform: (text) => extractLastJson(text) ?? text.trim(),
        }),
      }),
      providerOptions: {
        flash: {
          enable_thinking: false,
        },
      },
      abortSignal: options.abortSignal,
      instructions: [structuredOutputRepairPrompt, JSON.stringify(responseFormat.schema)].join(
        "\n",
      ),
      prompt: JSON.stringify({
        generatedText: error.text,
        validationError: String(error.cause),
      }),
      output: Output.json(),
      telemetry: getLangfuseTelemetry(),
    });

    const output = (await options.output.parseCompleteOutput(
      { text: repairResult.text },
      {
        response: repairResult.finalStep.response,
        usage: repairResult.usage,
        finishReason: repairResult.finishReason,
      },
    )) as StructuredOutputValue<OUTPUT>;

    return { ...repairResult, output, experimental_output: output };
  }
}
