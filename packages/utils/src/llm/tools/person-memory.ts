import { tool } from "ai";
import { z } from "zod";
import { getPersonMemory, listPersonMemories } from "../../memory";

export const listPersonMemoriesTool = tool({
  description:
    "分页列出当前已经存在人物记忆的昵称列表。结果按人物发言热度从高到低排序，需要更多结果时继续传入下一页 page。",
  inputSchema: z.object({
    page: z.number().int().min(1).optional().describe("页码，从 1 开始。"),
  }),
  execute: async ({ page }) => {
    const result = await listPersonMemories(page);
    return result;
  },
});

export const getPersonMemoryTool = tool({
  description:
    "按昵称批量读取人物长期记忆。当聊天消息中出现具体人物昵称、@ 提及对象、身份称呼、关系梗、喜好、雷区或会影响回复方式的人物信息时，先调用这个工具读取对应人物记忆，再决定如何自然回应。",
  inputSchema: z.object({
    nicknames: z
      .array(z.string().min(1))
      .min(1)
      .describe("要读取记忆的准确人物昵称，优先使用消息中的 @ displayName 或文本里出现的昵称。"),
  }),
  execute: async ({ nicknames }) => {
    const items = [];

    for (const nickname of nicknames) {
      items.push({
        nickname,
        memory: await getPersonMemory(nickname),
      });
    }

    return {
      items,
    };
  },
});
