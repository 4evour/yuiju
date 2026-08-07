import {
  buildHermesPhoneSystemPrompt,
  buildPhoneUseHermesSystemPrompt,
  flashModel,
  generateStructuredOutput,
  hermesAgentModel,
} from "@yuiju/utils";
import { getLangfuseTelemetry } from "@yuiju/utils/llm/langfuse-telemetry";
import { generateText, Output } from "ai";
import { z } from "zod";

export async function generateHermesUserPromptFromPhoneReason(actionReason: string) {
  const { output } = await generateStructuredOutput({
    model: flashModel,
    instructions: buildPhoneUseHermesSystemPrompt(),
    prompt: `
## Action reason
${actionReason}
`.trim(),
    output: Output.object({
      schema: z.object({
        isValidIntent: z.boolean().describe("reason 是否命中当前已有手机功能"),
        phoneApplication: z
          .string()
          .describe("本次使用的手机应用程序名称，例如：「云旅游」；非法意图填“未知应用”"),
        hermesUserPrompt: z.string().describe("要发送给手机能力执行器的直接任务指令"),
      }),
    }),
  });

  return output;
}

export async function runHermesPhoneAgent(userPrompt: string) {
  const { text } = await generateText({
    model: hermesAgentModel,
    telemetry: getLangfuseTelemetry(),
    instructions: buildHermesPhoneSystemPrompt(),
    prompt: userPrompt,
    timeout: 2 * 60 * 60 * 1000,
  });

  return text.trim();
}
