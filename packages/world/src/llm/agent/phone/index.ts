import { generateStructuredOutput } from "@yuiju/utils/llm/generate-structured-output";
import { getFlashModel } from "@yuiju/utils/llm/models";
import { buildPhoneUseSystemPrompt } from "@yuiju/utils/prompt/phone";
import { Output } from "ai";
import { z } from "zod";
import { runCloudTravel } from "./cloud-travel";

const phoneApplicationSchema = z.enum(["云旅游", "未知应用"]);

export type PhoneApplication = z.infer<typeof phoneApplicationSchema>;

export async function generatePhoneUsePlanFromReason(actionReason: string) {
  const { output } = await generateStructuredOutput({
    model: getFlashModel(),
    reasoning: "none",
    instructions: buildPhoneUseSystemPrompt(),
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
        cloudTravelLocation: z
          .string()
          .nullable()
          .describe("指定云旅游地点时输出地点名称；随机云旅游或非法意图时输出 null"),
      }),
    }),
  });

  return output;
}

export async function runPhoneApplication(
  phoneApplication: PhoneApplication,
  cloudTravelLocation: string | null,
) {
  if (phoneApplication === "云旅游") {
    return runCloudTravel(cloudTravelLocation);
  }

  throw new Error(`不支持的手机应用：${phoneApplication}`);
}
