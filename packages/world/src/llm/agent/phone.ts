import {
  buildHermesCloudTravelSystemPrompt,
  buildHermesPhoneSystemPrompt,
  buildPhoneUseHermesSystemPrompt,
  flashModel,
  generateStructuredOutput,
  hermesAgentModel,
} from "@yuiju/utils";
import { getLangfuseTelemetry } from "@yuiju/utils/llm/langfuse-telemetry";
import { generateText, Output } from "ai";
import { z } from "zod";

const phoneApplicationSchema = z.enum(["云旅游", "未知应用"]);

export type PhoneApplication = z.infer<typeof phoneApplicationSchema>;

const applicationSystemPromptBuilderByName = {
  云旅游: buildHermesCloudTravelSystemPrompt,
} satisfies Record<Exclude<PhoneApplication, "未知应用">, () => string>;

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
        phoneApplication: phoneApplicationSchema.describe(
          "合法意图输出对应应用；非法意图输出“未知应用”",
        ),
        hermesUserPrompt: z.string().describe("要发送给手机能力执行器的直接任务指令"),
      }),
    }),
  });

  return output;
}

export async function runHermesPhoneAgent(phoneApplication: PhoneApplication, userPrompt: string) {
  if (phoneApplication === "未知应用") {
    throw new Error(`不支持的手机应用：${phoneApplication}`);
  }

  const applicationSystemPrompt = applicationSystemPromptBuilderByName[phoneApplication]();
  const { text } = await generateText({
    model: hermesAgentModel,
    telemetry: getLangfuseTelemetry(),
    instructions: [buildHermesPhoneSystemPrompt(), applicationSystemPrompt].join("\n\n"),
    prompt: userPrompt,
    timeout: 2 * 60 * 60 * 1000,
  });

  return text.trim();
}
