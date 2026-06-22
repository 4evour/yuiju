import type { MemoryDiarySummaryPeriod } from "../../memory/diary";
import { hasSyncMongoUri, type MongoReadSource } from "../connect";
import {
  getMemoryDiarySummaryModel,
  type IMemoryDiarySummary,
} from "../schema/memory-diary-summary.schema";

export interface MemoryDiarySummaryWriteInput {
  subject: string;
  period: MemoryDiarySummaryPeriod;
  periodStartDate: Date;
  periodEndDate: Date;
  text: string;
  isDev?: boolean;
}

export interface GetMemoryDiarySummariesOptions {
  limit?: number;
  skip?: number;
  subject?: string;
  period?: MemoryDiarySummaryPeriod;
  isDev?: boolean;
  periodStartDateAfter?: Date;
  periodStartDateBefore?: Date;
  sortDirection?: "asc" | "desc";
  readFrom?: MongoReadSource;
}

function buildMemoryDiarySummaryFilter(
  options: GetMemoryDiarySummariesOptions = {},
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (options.subject) {
    filter.subject = options.subject;
  }
  if (options.period) {
    filter.period = options.period;
  }
  if (typeof options.isDev === "boolean") {
    filter.isDev = options.isDev;
  }
  if (options.periodStartDateAfter || options.periodStartDateBefore) {
    filter.periodStartDate = {};
    if (options.periodStartDateAfter) {
      (filter.periodStartDate as Record<string, Date>).$gte = options.periodStartDateAfter;
    }
    if (options.periodStartDateBefore) {
      (filter.periodStartDate as Record<string, Date>).$lt = options.periodStartDateBefore;
    }
  }

  return filter;
}

export async function upsertMemoryDiarySummary(
  input: MemoryDiarySummaryWriteInput,
): Promise<IMemoryDiarySummary> {
  const now = new Date();
  const model = await getMemoryDiarySummaryModel();

  const summary = await model
    .findOneAndUpdate(
      {
        subject: input.subject,
        period: input.period,
        periodStartDate: input.periodStartDate,
        isDev: input.isDev ?? false,
      },
      {
        $set: {
          periodEndDate: input.periodEndDate,
          text: input.text,
          generatedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          subject: input.subject,
          period: input.period,
          periodStartDate: input.periodStartDate,
          isDev: input.isDev ?? false,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    )
    .exec();

  if (!summary) {
    throw new Error("upsertMemoryDiarySummary failed");
  }

  await syncMemoryDiarySummaryDocument(summary);
  return summary;
}

export async function getMemoryDiarySummaries(
  options: GetMemoryDiarySummariesOptions = {},
): Promise<IMemoryDiarySummary[]> {
  const filter = buildMemoryDiarySummaryFilter(options);
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;
  const model = await getMemoryDiarySummaryModel(options.readFrom);

  return await model
    .find(filter)
    .sort({ periodStartDate: sortDirection, updatedAt: sortDirection })
    .skip(Math.max(0, options.skip ?? 0))
    .limit(options.limit ?? 10)
    .exec();
}

async function syncMemoryDiarySummaryDocument(summary: IMemoryDiarySummary): Promise<void> {
  if (!hasSyncMongoUri()) {
    return;
  }

  try {
    const syncModel = await getMemoryDiarySummaryModel("sync");
    await syncModel
      .replaceOne(
        {
          subject: summary.subject,
          period: summary.period,
          periodStartDate: summary.periodStartDate,
          isDev: summary.isDev,
        },
        {
          _id: summary._id,
          subject: summary.subject,
          period: summary.period,
          periodStartDate: summary.periodStartDate,
          periodEndDate: summary.periodEndDate,
          text: summary.text,
          generatedAt: summary.generatedAt,
          updatedAt: summary.updatedAt,
          isDev: summary.isDev,
        },
        { upsert: true },
      )
      .exec();
  } catch (error) {
    console.error(`Sync Mongo write failed: memory_diary_summary ${summary._id}`, error);
  }
}
