import dayjs from "dayjs";
import { SUBJECT_NAME } from "../constants";
import { getMemoryDiaries, getRecentMemoryEpisodes } from "../db";
import { isDev } from "../env";
import { formatProjectTime, parseProjectTime } from "../time";
import { DEFAULT_DIARY_SUBJECT, type MemoryDiarySummaryPeriod } from "./diary";

export type MemoryQueryTimeSort = "asc" | "desc";

export interface EpisodeSearchInput {
  startTime?: string;
  endTime?: string;
  timeSort?: MemoryQueryTimeSort;
  limit?: number;
}

export interface DiarySearchInput {
  startTime?: string;
  endTime?: string;
  timeSort?: MemoryQueryTimeSort;
  period?: "day" | MemoryDiarySummaryPeriod;
  /**
   * 默认2
   */
  limit?: number;
}

export interface EpisodeSearchResult {
  time: string;
  event: string;
}

export interface DiarySearchResult {
  date: string;
  period?: "day" | MemoryDiarySummaryPeriod;
  content: string;
}

/**
 * 查询今天的 Episode 记忆。
 *
 * 说明：
 * - 固定查询今天整天；
 * - 保留 timeSort 给上层控制返回顺序；
 * - 返回结果只保留 LLM 真正需要的时间和摘要。
 */
export async function searchEpisodes(input: EpisodeSearchInput): Promise<EpisodeSearchResult[]> {
  const limit = input.limit ?? 10;
  const timeSort = input.timeSort ?? "desc";
  const parsedStartTime = parseProjectTime(input.startTime?.trim() ?? "", "YYYY-MM-DD HH:mm:ss");
  const parsedEndTime = parseProjectTime(input.endTime?.trim() ?? "", "YYYY-MM-DD HH:mm:ss");

  const docs = await getRecentMemoryEpisodes({
    limit,
    subject: SUBJECT_NAME,
    isDev: isDev(),
    sortDirection: timeSort,
    onlyDate: parsedStartTime || parsedEndTime ? undefined : dayjs().toDate(),
    happenedAfter: parsedStartTime,
    happenedBefore: parsedEndTime,
  });

  return docs.map((doc) => ({
    time: formatProjectTime(doc.happenedAt, "HH:mm:ss"),
    event: doc.summaryText,
  }));
}

/**
 * 查询昨天及更早的 Diary 回忆。
 *
 * 说明：
 * - 只接受自然日范围；
 * - 如果不传日期范围，默认查询今天之前的全部日记；
 * - 返回结果只保留 LLM 真正需要的时间和正文。
 */
export async function searchDiaries(input: DiarySearchInput): Promise<DiarySearchResult[]> {
  const limit = input.limit ?? 2;
  const timeSort = input.timeSort ?? "desc";
  const period = input.period ?? "day";
  const parsedStartTime = parseProjectTime(input.startTime?.trim() ?? "", "YYYY-MM-DD HH:mm:ss");
  const parsedEndTime = parseProjectTime(input.endTime?.trim() ?? "", "YYYY-MM-DD HH:mm:ss");
  const startDay = parsedStartTime ? dayjs(parsedStartTime).startOf("day").toDate() : undefined;
  const endDay = parsedEndTime ? dayjs(parsedEndTime).startOf("day").toDate() : undefined;

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day").toDate();

  if (startDay || endDay) {
    startDate = startDay;
    endDate = endDay;

    if (startDate && endDate && startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    // Diary 只保存今天之前的回忆；查询范围碰到今天或未来时，最多截到昨天。
    if (startDate && dayjs(startDate).valueOf() >= today.valueOf()) {
      return [];
    }
    if (endDate && dayjs(endDate).valueOf() >= today.valueOf()) {
      endDate = yesterday;
    }
  } else {
    endDate = yesterday;
  }

  const diaries = await getMemoryDiaries({
    limit,
    subject: DEFAULT_DIARY_SUBJECT,
    period,
    isDev: isDev(),
    sortDirection: timeSort,
    startDate,
    endDate,
  });

  return diaries.map((diary) => ({
    date:
      diary.period === "day"
        ? formatProjectTime(diary.diaryDate, "YYYY-MM-DD")
        : `${formatProjectTime(diary.diaryDate, "YYYY-MM-DD")}~${formatProjectTime(diary.diaryEndDate, "YYYY-MM-DD")}`,
    period: diary.period,
    content: diary.text,
  }));
}
