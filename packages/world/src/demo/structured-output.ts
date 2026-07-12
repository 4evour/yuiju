import { flashModel, generateStructuredOutput, visionModel } from "@yuiju/utils";
import { Output, tool } from "ai";
import { z } from "zod";

const structuredOutputSchema = z.strictObject({
  title: z.string().min(1).describe("测试数据标题"),
  summary: z.string().min(1).describe("测试数据摘要"),
  confidence: z.number().min(0).max(1).describe("结果可信度"),
  category: z.enum(["analysis", "planning", "report"]).describe("数据分类"),
  tags: z.array(z.string().min(1)).min(2).describe("至少两个标签"),
  metrics: z.strictObject({
    requestCount: z.number().int().min(0),
    successRate: z.number().min(0).max(1),
    averageLatencyMs: z.number().int().min(0),
  }),
  items: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        name: z.string().min(1),
        priority: z.enum(["low", "medium", "high"]),
        completed: z.boolean(),
        notes: z.array(z.string()),
      }),
    )
    .min(2),
  conclusion: z.string().nullable().describe("测试结论；没有结论时填 null"),
});

const demoTool = tool({
  description: "读取结构化输出测试的固定参考数据。当前测试不需要调用此工具。",
  inputSchema: z.strictObject({
    topic: z.enum(["structured-output"]),
  }),
  execute: async () => ({
    reference: "这是结构化输出能力测试的固定参考数据。",
  }),
});

export async function main() {
  for (const { name, model } of [
    { name: "flash", model: flashModel },
    { name: "vision", model: visionModel },
  ]) {
    const { output } = await generateStructuredOutput({
      model,
      tools: {
        readStructuredOutputTestReference: demoTool,
      },
      output: Output.object({
        schema: structuredOutputSchema,
      }),
      prompt: `
生成一份虚构的结构化输出测试报告。
不要调用任何工具。
items 必须包含两项，且 priority 分别为 high 和 low。
`.trim(),
    });

    console.log(`\n[${name}]`);
    console.log(JSON.stringify(output, null, 2));
  }
}
