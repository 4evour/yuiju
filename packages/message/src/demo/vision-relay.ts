import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { buildMessageImageDescriptionSystemPrompt, generateStructuredOutput } from "@yuiju/utils";
import { getYuijuConfig } from "@yuiju/utils/config/config";
import { Output } from "ai";
import { z } from "zod";

const IMAGE_URLS = [
  "https://note.yixiaojiu.top/img/blog/rainy-cafe-short-story.webp",
  "https://eo-img.loliapi.cn/i/pc/img67.webp",
  "https://eo-img.544521.xyz/i/pc/img76.webp",
];

export async function main() {
  const relaySource = getYuijuConfig().llm.models.vision[1];
  let requestCount = 0;
  const relayProvider = createOpenAICompatible({
    name: "vision-relay-demo",
    baseURL: relaySource.baseUrl,
    apiKey: relaySource.apiKey,
    supportsStructuredOutputs: true,
    fetch: async (input, init) => {
      requestCount += 1;
      return fetch(input, init);
    },
  });

  try {
    const result = await generateStructuredOutput({
      model: relayProvider(relaySource.model),
      instructions: buildMessageImageDescriptionSystemPrompt(),
      providerOptions: {
        "vision-relay-demo": {
          enable_thinking: false,
        },
      },
      messages: [
        {
          role: "user",
          content: IMAGE_URLS.flatMap((imageUrl, index) => [
            {
              type: "text" as const,
              text: `图片 ${index + 1} summary:`,
            },
            {
              type: "file" as const,
              data: new URL(imageUrl),
              mediaType: "image/webp",
            },
          ]),
        },
      ],
      output: Output.object({
        schema: z.object({
          descriptions: z
            .array(z.string().trim().min(1).max(100))
            .length(IMAGE_URLS.length)
            .describe("你为各图片生成的中文描述，顺序必须与图片编号一致"),
        }),
      }),
    });

    console.log("[vision-relay] 结构化识图结果:");
    console.log(JSON.stringify(result.output, null, 2));
  } finally {
    console.log(`[vision-relay] 模型请求次数: ${requestCount}`);
  }
}
