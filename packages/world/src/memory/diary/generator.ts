import {
  buildDiarySummarySystemPrompt,
  buildDiarySystemPrompt,
  DEFAULT_DIARY_SUBJECT,
  type DiarySummaryMaterial,
  flashModel,
  getMemoryDiaries,
  getRecentMemoryEpisodes,
  type IMemoryEpisode,
  type MemoryDiaryPeriod,
  type MemoryDiarySummaryPeriod,
  resolveDiarySummaryPeriodRange,
  SUBJECT_NAME,
  summarizeConversationDiaryMaterials,
  upsertMemoryDiary,
} from "@yuiju/utils";
import { generateText } from "ai";
import dayjs from "dayjs";
import { logger } from "@/utils/logger";

const MAX_EPISODES_PER_DAY = 500;
const SLEEP_DIARY_ROLLOVER_HOUR = 6;
const CONVERSATION_SUMMARY_CHAR_BUDGET = 20_000;

export interface GenerateDiaryForDateInput {
  diaryDate: Date;
  subject?: string;
  isDev: boolean;
}

function estimateDiaryMaterialChars(materials: DiarySummaryMaterial[]): number {
  return materials.reduce((total, material) => {
    return total + material.type.length + material.happenedAt.length + material.content.length;
  }, 0);
}

async function writeDiaryText(input: {
  subject: string;
  diaryDate: Date;
  materials: DiarySummaryMaterial[];
}): Promise<string> {
  const result = await generateText({
    model: flashModel,
    providerOptions: {
      flash: {
        enable_thinking: false,
      },
    },
    system: buildDiarySystemPrompt({
      subject: input.subject,
      diaryDate: input.diaryDate,
    }),
    prompt: [
      "以下是今天真实发生过的素材，请严格基于这些内容写日记。",
      JSON.stringify(
        input.materials.map((item) => ({
          type: item.type,
          happenedAt: item.happenedAt,
          content: item.content,
        })),
      ),
    ].join("\n"),
  });

  return result.text.trim();
}

async function writeDiarySummaryText(input: {
  subject: string;
  period: MemoryDiarySummaryPeriod;
  periodStartDate: Date;
  periodEndDate: Date;
  sourcePeriod: MemoryDiaryPeriod;
  sourceDiaries: { diaryDate: Date; periodEndDate: Date; text: string }[];
}): Promise<string> {
  const result = await generateText({
    model: flashModel,
    providerOptions: {
      flash: {
        enable_thinking: false,
      },
    },
    system: buildDiarySummarySystemPrompt({
      subject: input.subject,
      period: input.period,
      periodStartDate: input.periodStartDate,
      periodEndDate: input.periodEndDate,
      sourcePeriod: input.sourcePeriod,
    }),
    prompt: [
      "以下是这一阶段已经生成的下级 Diary 或阶段总结，请严格基于这些内容整理阶段性回忆。",
      JSON.stringify(
        input.sourceDiaries.map((diary) => ({
          dateRange: `${dayjs(diary.diaryDate).format("YYYY-MM-DD")}~${dayjs(diary.periodEndDate).subtract(1, "day").format("YYYY-MM-DD")}`,
          text: diary.text,
        })),
      ),
    ].join("\n"),
  });

  return result.text.trim();
}

async function loadEpisodesForDiary(input: {
  diaryDate: Date;
  subject: string;
  isDev: boolean;
}): Promise<IMemoryEpisode[]> {
  return await getRecentMemoryEpisodes({
    limit: MAX_EPISODES_PER_DAY,
    subject: input.subject,
    isDev: input.isDev,
    onlyDate: input.diaryDate,
    sortDirection: "asc",
  });
}

/**
 * 将同一天的 Episode 转换成适合写日记的素材列表。
 *
 * 说明：
 * - Episode 写入时已经把关键信息放进 summaryText；
 * - 非聊天事件直接保留摘要；
 * - 聊天事件不再展开原始消息，只在聊天摘要总量过大时整体压缩一次。
 */
export async function buildDiaryMaterials(
  episodes: IMemoryEpisode[],
): Promise<DiarySummaryMaterial[]> {
  const nonConversationMaterials = episodes
    .filter((episode) => episode.type !== "conversation")
    .map(function buildEpisodeMaterial(episode: IMemoryEpisode): DiarySummaryMaterial {
      return {
        type: episode.type,
        happenedAt: dayjs(episode.happenedAt).toISOString(),
        content: episode.summaryText,
      };
    });

  const conversationMaterials = episodes
    .filter((episode) => episode.type === "conversation")
    .map(function buildConversationMaterial(episode: IMemoryEpisode): DiarySummaryMaterial {
      return {
        type: episode.type,
        happenedAt: dayjs(episode.happenedAt).toISOString(),
        content: episode.summaryText,
      };
    });

  const finalConversationMaterials =
    estimateDiaryMaterialChars(conversationMaterials) <= CONVERSATION_SUMMARY_CHAR_BUDGET
      ? conversationMaterials
      : [await summarizeConversationDiaryMaterials(conversationMaterials)];

  return [...nonConversationMaterials, ...finalConversationMaterials].sort((left, right) => {
    return dayjs(left.happenedAt).valueOf() - dayjs(right.happenedAt).valueOf();
  });
}

/**
 * 将“入睡时刻”映射为应写入的日记日期。
 *
 * 说明：
 * - 22:00-23:59 入睡，记为当天；
 * - 00:00-05:59 熬夜后入睡，记为前一天；
 * - 该规则与当前 isNight 的时间边界保持一致。
 */
export function resolveDiaryDateForSleep(happenedAt: Date): Date {
  const sleepTime = dayjs(happenedAt);

  if (sleepTime.hour() < SLEEP_DIARY_ROLLOVER_HOUR) {
    return sleepTime.subtract(1, "day").startOf("day").toDate();
  }

  return sleepTime.startOf("day").toDate();
}

/**
 * 为指定自然日生成或覆盖一篇 Diary。
 */
export async function generateDiaryForDate(input: GenerateDiaryForDateInput): Promise<boolean> {
  const subject = input.subject ?? DEFAULT_DIARY_SUBJECT;
  const episodes = await loadEpisodesForDiary({
    diaryDate: input.diaryDate,
    subject: SUBJECT_NAME,
    isDev: input.isDev,
  });

  if (episodes.length === 0) {
    logger.debug("[generateDiaryForDate] no episodes found", {
      subject,
      diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
    });
    return false;
  }

  const materials = await buildDiaryMaterials(episodes);
  if (materials.length === 0) {
    logger.debug("[generateDiaryForDate] no diary materials built", {
      subject,
      diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
    });
    return false;
  }

  const diaryText = await writeDiaryText({
    subject,
    diaryDate: input.diaryDate,
    materials,
  });

  if (!diaryText.trim()) {
    logger.warn("[generateDiaryForDate] generated empty diary text", {
      subject,
      diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
    });
    return false;
  }

  await upsertMemoryDiary({
    subject,
    diaryDate: input.diaryDate,
    text: diaryText,
    isDev: input.isDev,
  });

  await refreshDiarySummariesForDate({
    subject,
    diaryDate: input.diaryDate,
    isDev: input.isDev,
  });

  logger.info("[generateDiaryForDate] diary generated", {
    subject,
    diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
  });

  return true;
}

export async function refreshDiarySummariesForDate(input: {
  subject?: string;
  diaryDate: Date;
  isDev: boolean;
}): Promise<void> {
  const subject = input.subject ?? DEFAULT_DIARY_SUBJECT;

  await refreshDiarySummaryForPeriod({
    subject,
    targetDate: input.diaryDate,
    period: "week",
    sourcePeriod: "day",
    isDev: input.isDev,
  });
  await refreshDiarySummaryForPeriod({
    subject,
    targetDate: input.diaryDate,
    period: "month",
    sourcePeriod: "week",
    isDev: input.isDev,
  });
  await refreshDiarySummaryForPeriod({
    subject,
    targetDate: input.diaryDate,
    period: "year",
    sourcePeriod: "month",
    isDev: input.isDev,
  });
}

async function refreshDiarySummaryForPeriod(input: {
  subject: string;
  targetDate: Date;
  period: MemoryDiarySummaryPeriod;
  sourcePeriod: MemoryDiaryPeriod;
  isDev: boolean;
}): Promise<void> {
  const { periodStartDate, periodEndDate } = resolveDiarySummaryPeriodRange({
    period: input.period,
    date: input.targetDate,
  });
  const sourceDiaries = await getMemoryDiaries({
    subject: input.subject,
    period: input.sourcePeriod,
    isDev: input.isDev,
    diaryDateBefore: periodEndDate,
    periodEndDateAfter: periodStartDate,
    sortDirection: "asc",
    limit: 400,
  });

  if (sourceDiaries.length === 0) {
    return;
  }

  const summaryText = await writeDiarySummaryText({
    subject: input.subject,
    period: input.period,
    periodStartDate,
    periodEndDate,
    sourcePeriod: input.sourcePeriod,
    sourceDiaries: sourceDiaries.map((diary) => ({
      diaryDate: diary.diaryDate,
      periodEndDate: diary.periodEndDate,
      text: diary.text,
    })),
  });

  if (!summaryText.trim()) {
    logger.warn("[refreshDiarySummariesForDate] generated empty diary summary", {
      subject: input.subject,
      period: input.period,
      diaryDate: dayjs(input.targetDate).format("YYYY-MM-DD"),
    });
    return;
  }

  await upsertMemoryDiary({
    subject: input.subject,
    period: input.period,
    diaryDate: periodStartDate,
    periodEndDate,
    text: summaryText,
    isDev: input.isDev,
  });
}
