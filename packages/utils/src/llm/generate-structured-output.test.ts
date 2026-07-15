import { type LanguageModel, Output } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateStructuredOutput } from "./generate-structured-output";

describe("generateStructuredOutput", () => {
  it("在 AI SDK 解析前提取前置分析文本后的 JSON", async () => {
    const model: Extract<LanguageModel, { specificationVersion: "v4" }> = {
      specificationVersion: "v4",
      provider: "test",
      modelId: "test-model",
      supportedUrls: {},
      doGenerate: async () => ({
        content: [
          {
            type: "text",
            text: '分析完成。\n\n```json\n{"shouldUpdate":false,"changes":[]}\n```',
          },
        ],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: 1,
            noCache: 1,
            cacheRead: 0,
            cacheWrite: 0,
          },
          outputTokens: {
            total: 1,
            text: 1,
            reasoning: 0,
          },
        },
        warnings: [],
      }),
      doStream: async () => {
        throw new Error("不应调用流式生成");
      },
    };

    const { output } = await generateStructuredOutput({
      model,
      prompt: "生成结果",
      output: Output.object({
        schema: z.object({
          shouldUpdate: z.boolean(),
          changes: z.array(z.string()),
        }),
      }),
    });

    expect(output).toEqual({ shouldUpdate: false, changes: [] });
  });
});
