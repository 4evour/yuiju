import type { Tool } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { searchDiaries, searchEpisodes } from "../../memory";
import { searchDailyDiaryChunks } from "../../memory/diary-vector-index";

const todayEventSearchInputSchema = z.strictObject({
  limit: z.number().int().min(1).max(20).optional().describe("返回结果上限，默认 10"),
  startHour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .optional()
    .describe("开始小时，例如 15 表示 15:00:00。"),
  endHour: z.number().int().min(0).max(23).optional().describe("结束小时，例如 18 表示 18:59:59。"),
  timeSort: z.enum(["asc", "desc"]).optional().describe("asc时间正序，desc时间倒序。"),
});

const diarySearchInputSchema = z.strictObject({
  limit: z.number().int().min(1).max(20).optional().describe("返回结果上限，默认 2。"),
  startDate: z.string().optional().describe("开始日期，格式 YYYY-MM-DD。"),
  endDate: z.string().optional().describe("结束日期，格式 YYYY-MM-DD。"),
  period: z
    .enum(["day", "week", "month", "year"])
    .optional()
    .describe("查询粒度。day 查询每日 Diary；week/month/year 查询对应周期总结。默认 day。"),
});

const semanticDiarySearchInputSchema = z.strictObject({
  query: z
    .string()
    .min(1)
    .describe("要检索的完整自然语言问题，应包含相关人物、地点、事件和时间线索。"),
  limit: z.number().int().min(1).max(10).optional().describe("返回结果上限，默认 5。"),
});

export const todayEventSearchTool: Tool = {
  description: "查询今天发生过的事",
  inputSchema: todayEventSearchInputSchema,
  execute: async (input) => {
    const today = dayjs();
    const result = await searchEpisodes({
      limit: input.limit,
      startTime:
        input.startHour === undefined
          ? undefined
          : today.hour(input.startHour).minute(0).second(0).format("YYYY-MM-DD HH:mm:ss"),
      endTime:
        input.endHour === undefined
          ? undefined
          : today.hour(input.endHour).minute(59).second(59).format("YYYY-MM-DD HH:mm:ss"),
      timeSort: input.timeSort ?? "desc",
    });
    return result;
  },
};

export const diarySearchTool: Tool = {
  description:
    "查询昨天及更早的日记。可按自然日范围筛选；不用于今天的事件查询，也不用于长期事实查询。",
  inputSchema: diarySearchInputSchema,
  execute: async (input) => {
    const result = await searchDiaries({
      limit: input.limit,
      period: input.period,
      startTime: input.startDate ? `${input.startDate} 00:00:00` : undefined,
      endTime: input.endDate ? `${input.endDate} 23:59:59` : undefined,
    });
    return result;
  },
};

export const semanticDiarySearchTool: Tool = {
  description: "按语义检索昨天及更早的每日记忆片段，用于回忆过去的经历、地点或人物事件。",
  inputSchema: semanticDiarySearchInputSchema,
  execute: async (input) => {
    return searchDailyDiaryChunks(input.query, input.limit ?? 5);
  },
};
