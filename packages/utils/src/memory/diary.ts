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
  periodEndDate: Date;
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

export function resolveDiarySummaryPeriodRange(input: { period: MemoryDiaryPeriod; date: Date }): {
  periodStartDate: Date;
  periodEndDate: Date;
} {
  const date = new Date(input.date);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (input.period === "day") {
    const periodEndDate = new Date(startOfDay);
    periodEndDate.setDate(startOfDay.getDate() + 1);
    return { periodStartDate: startOfDay, periodEndDate };
  }

  if (input.period === "week") {
    const mondayOffset = (startOfDay.getDay() + 6) % 7;
    const periodStartDate = new Date(startOfDay);
    periodStartDate.setDate(startOfDay.getDate() - mondayOffset);
    const periodEndDate = new Date(periodStartDate);
    periodEndDate.setDate(periodStartDate.getDate() + 7);
    return { periodStartDate, periodEndDate };
  }

  if (input.period === "month") {
    const periodStartDate = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const periodEndDate = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 1);
    return { periodStartDate, periodEndDate };
  }

  const periodStartDate = new Date(startOfDay.getFullYear(), 0, 1);
  const periodEndDate = new Date(startOfDay.getFullYear() + 1, 0, 1);
  return { periodStartDate, periodEndDate };
}
