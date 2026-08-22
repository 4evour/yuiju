import {
  buildDiarySummarySystemPrompt,
  DEFAULT_DIARY_SUBJECT,
  getMemoryDiaries,
  type MemoryDiaryPeriod,
  type MemoryDiarySummaryPeriod,
  upsertMemoryDiary,
} from "@yuiju/utils";
import { getLangfuseTelemetry } from "@yuiju/utils/llm/langfuse-telemetry";
import { getFlashModel } from "@yuiju/utils/llm/models";
import { generateText } from "ai";
import dayjs from "dayjs";
import { logger } from "@/utils/logger";

async function writeDiarySummaryText(input: {
  subject: string;
  period: MemoryDiarySummaryPeriod;
  periodStartDate: Date;
  diaryEndDate: Date;
  sourcePeriod: MemoryDiaryPeriod;
  sourceDiaries: { diaryDate: Date; diaryEndDate: Date; text: string }[];
}): Promise<string> {
  const result = await generateText({
    model: getFlashModel(),
    telemetry: getLangfuseTelemetry(),
    providerOptions: {
      flash: {
        enable_thinking: true,
      },
    },
    instructions: buildDiarySummarySystemPrompt({
      subject: input.subject,
      period: input.period,
      periodStartDate: input.periodStartDate,
      diaryEndDate: input.diaryEndDate,
      sourcePeriod: input.sourcePeriod,
    }),
    prompt: [
      "以下是这一阶段已经生成的下级 Diary 或阶段总结，请严格基于这些内容整理阶段性回忆。",
      JSON.stringify(
        input.sourceDiaries.map((diary) => ({
          dateRange: `${dayjs(diary.diaryDate).format("YYYY-MM-DD")}~${dayjs(diary.diaryEndDate).format("YYYY-MM-DD")}`,
          text: diary.text,
        })),
      ),
    ].join("\n"),
  });

  return result.text.trim();
}

export async function refreshDiarySummariesForDate(input: {
  subject?: string;
  diaryDate: Date;
  isDev: boolean;
}): Promise<void> {
  const subject = input.subject ?? DEFAULT_DIARY_SUBJECT;
  const diaryDate = dayjs(input.diaryDate).startOf("day");

  if (diaryDate.day() === 0) {
    await refreshDiarySummaryForPeriod({
      subject,
      targetDate: diaryDate.toDate(),
      period: "week",
      sourcePeriod: "day",
      isDev: input.isDev,
    });
  }

  if (diaryDate.isSame(diaryDate.endOf("month"), "day")) {
    await refreshDiarySummaryForPeriod({
      subject,
      targetDate: diaryDate.toDate(),
      period: "month",
      sourcePeriod: "week",
      isDev: input.isDev,
    });
  }

  if (diaryDate.isSame(diaryDate.endOf("year"), "day")) {
    await refreshDiarySummaryForPeriod({
      subject,
      targetDate: diaryDate.toDate(),
      period: "year",
      sourcePeriod: "month",
      isDev: input.isDev,
    });
  }
}

async function refreshDiarySummaryForPeriod(input: {
  subject: string;
  targetDate: Date;
  period: MemoryDiarySummaryPeriod;
  sourcePeriod: MemoryDiaryPeriod;
  isDev: boolean;
}): Promise<void> {
  const targetDate = dayjs(input.targetDate).startOf("day");
  let periodStartDate: Date;
  let diaryEndDate: Date;
  let sourceStartDate: Date;

  if (input.period === "week") {
    periodStartDate = targetDate.subtract((targetDate.day() + 6) % 7, "day").toDate();
    diaryEndDate = dayjs(periodStartDate).add(6, "day").toDate();
    sourceStartDate = periodStartDate;
  } else if (input.period === "month") {
    periodStartDate = targetDate.startOf("month").toDate();
    diaryEndDate = targetDate.endOf("month").startOf("day").toDate();
    sourceStartDate = dayjs(periodStartDate)
      .subtract((dayjs(periodStartDate).day() + 6) % 7, "day")
      .toDate();
  } else {
    periodStartDate = targetDate.startOf("year").toDate();
    diaryEndDate = targetDate.endOf("year").startOf("day").toDate();
    sourceStartDate = periodStartDate;
  }

  const sourceDiaries = await getMemoryDiaries({
    subject: input.subject,
    period: input.sourcePeriod,
    isDev: input.isDev,
    startDate: sourceStartDate,
    endDate: diaryEndDate,
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
    diaryEndDate,
    sourcePeriod: input.sourcePeriod,
    sourceDiaries: sourceDiaries.map((diary) => ({
      diaryDate: diary.diaryDate,
      diaryEndDate: diary.diaryEndDate,
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
    diaryEndDate,
    text: summaryText,
    isDev: input.isDev,
  });
}
