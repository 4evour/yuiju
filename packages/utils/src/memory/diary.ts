/**
 * 统一 Diary 写入模型。
 *
 * 说明：
 * - Diary 是过去经历的叙事归档层，不替代 Episode 真相源；
 * - text 只保存完整日记正文，尽量贴近“少女写日记”的阅读形态。
 */
export interface MemoryDiaryEntry {
  subject: string;
  period: MemoryDiaryPeriod;
  diaryDate: Date;
  diaryEndDate: Date;
  text: string;
  generatedAt?: Date;
  updatedAt?: Date;
  isDev?: boolean;
}

export type MemoryDiaryPeriod = "day" | "week" | "month" | "year";
export type MemoryDiarySummaryPeriod = Exclude<MemoryDiaryPeriod, "day">;

/**
 * 当前项目中默认的日记主体。
 */
export const DEFAULT_DIARY_SUBJECT = "ゆいじゅ";
