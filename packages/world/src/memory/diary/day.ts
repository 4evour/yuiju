import {
  buildDiarySystemPrompt,
  DEFAULT_DIARY_SUBJECT,
  type DiarySummaryMaterial,
  getRecentMemoryEpisodes,
  type IMemoryEpisode,
  SUBJECT_NAME,
  summarizeConversationDiaryMaterials,
  updateCoreMemoryFromEpisodes,
  upsertMemoryDiary,
} from "@yuiju/utils";
import { getPromptCustomizationOverrides } from "@yuiju/utils/db/operations/prompt-customization";
import { getLangfuseTelemetry } from "@yuiju/utils/llm/langfuse-telemetry";
import { getFlashModel } from "@yuiju/utils/llm/models";
import { indexDailyDiary } from "@yuiju/utils/memory/diary-vector-index";
import { getPromptCustomizationContent } from "@yuiju/utils/prompt/prompt-customization";
import { generateText } from "ai";
import dayjs from "dayjs";
import { logger } from "@/utils/logger";

const SLEEP_DIARY_ROLLOVER_HOUR = 6;
const CONVERSATION_SUMMARY_CHAR_BUDGET = 20_000;

export interface GenerateDailyMemoriesForDateInput {
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
  diaryDate: Date;
  materials: DiarySummaryMaterial[];
}): Promise<string> {
  const promptOverrides = await getPromptCustomizationOverrides(["character", "diary"]);
  const result = await generateText({
    model: getFlashModel(),
    telemetry: getLangfuseTelemetry(),
    providerOptions: {
      flash: {
        enable_thinking: false,
      },
    },
    instructions: [
      getPromptCustomizationContent("character", promptOverrides),
      getPromptCustomizationContent("diary", promptOverrides),
      buildDiarySystemPrompt({ diaryDate: input.diaryDate }),
    ].join("\n\n"),
    prompt: JSON.stringify(
      input.materials.map((item) => ({
        type: item.type,
        happenedAt: item.happenedAt,
        content: item.content,
      })),
    ),
  });

  return result.text.trim();
}

async function loadEpisodesForDate(input: {
  diaryDate: Date;
  subject: string;
  isDev: boolean;
}): Promise<IMemoryEpisode[]> {
  return await getRecentMemoryEpisodes({
    limit: 200,
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
 * 读取指定自然日的 Episode，并将同一份输入交给日记与核心记忆生成流程。
 */
export async function generateDailyMemoriesForDate(
  input: GenerateDailyMemoriesForDateInput,
): Promise<void> {
  const subject = input.subject ?? DEFAULT_DIARY_SUBJECT;
  const episodes = await loadEpisodesForDate({
    diaryDate: input.diaryDate,
    subject: SUBJECT_NAME,
    isDev: input.isDev,
  });

  if (episodes.length === 0) {
    logger.debug("[generateDailyMemoriesForDate] no episodes found", {
      subject,
      diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
    });
    return;
  }

  await Promise.all([
    generateDiaryFromEpisodes({
      subject,
      diaryDate: input.diaryDate,
      isDev: input.isDev,
      episodes,
    }).catch((error) => {
      logger.error("[generateDailyMemoriesForDate] diary generation failed", error);
    }),
    updateCoreMemoryFromEpisodes({
      date: input.diaryDate,
      episodes,
    })
      .then((result) => {
        logger.info("[generateDailyMemoriesForDate] core memory update completed", result);
      })
      .catch((error) => {
        logger.error("[generateDailyMemoriesForDate] core memory update failed", error);
      }),
  ]);
}

async function generateDiaryFromEpisodes(input: {
  subject: string;
  diaryDate: Date;
  isDev: boolean;
  episodes: IMemoryEpisode[];
}): Promise<void> {
  const materials = await buildDiaryMaterials(input.episodes);
  if (materials.length === 0) {
    logger.debug("[generateDailyMemoriesForDate] no diary materials built", {
      subject: input.subject,
      diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
    });
    return;
  }

  const diaryText = await writeDiaryText({
    diaryDate: input.diaryDate,
    materials,
  });

  if (!diaryText.trim()) {
    logger.warn("[generateDailyMemoriesForDate] generated empty diary text", {
      subject: input.subject,
      diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
    });
    return;
  }

  const diary = await upsertMemoryDiary({
    subject: input.subject,
    diaryDate: input.diaryDate,
    diaryEndDate: input.diaryDate,
    text: diaryText,
    isDev: input.isDev,
  });
  await indexDailyDiary(diary);

  logger.info("[generateDailyMemoriesForDate] diary generated", {
    subject: input.subject,
    diaryDate: dayjs(input.diaryDate).format("YYYY-MM-DD"),
  });
}
