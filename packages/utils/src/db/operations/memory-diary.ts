import dayjs from "dayjs";
import type { MemoryDiaryPeriod } from "../../memory/diary";
import { hasSyncMongoUri, type MongoReadSource } from "../connect";
import { getMemoryDiaryModel, type IMemoryDiary } from "../schema/memory-diary.schema";

export interface MemoryDiaryWriteInput {
  subject: string;
  period?: MemoryDiaryPeriod;
  diaryDate: Date;
  diaryEndDate?: Date;
  text: string;
  isDev?: boolean;
}

export interface GetMemoryDiariesOptions {
  limit?: number;
  skip?: number;
  subject?: string;
  period?: MemoryDiaryPeriod;
  isDev?: boolean;
  startDate?: Date;
  endDate?: Date;
  sortDirection?: "asc" | "desc";
  readFrom?: MongoReadSource;
}

function normalizeDiaryDate(value: Date): Date {
  return dayjs(value).startOf("day").toDate();
}

/**
 * 统一构建 Diary 查询条件。
 *
 * 说明：
 * - 日期过滤在这里集中归一化，避免列表查询与总数统计出现条件漂移；
 * - `startDate` / `endDate` 表示查询范围，返回结果的 Diary 期间必须完整落在范围内。
 */
function buildMemoryDiaryFilter(options: GetMemoryDiariesOptions = {}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (options.subject) {
    filter.subject = options.subject;
  }
  filter.period = options.period ?? "day";
  if (typeof options.isDev === "boolean") {
    filter.isDev = options.isDev;
  }
  if (options.startDate) {
    filter.diaryDate = {};
    (filter.diaryDate as Record<string, Date>).$gte = normalizeDiaryDate(options.startDate);
  }
  if (options.endDate) {
    filter.diaryEndDate = {
      $lte: normalizeDiaryDate(options.endDate),
    };
  }
  return filter;
}

/**
 * 按“同主体 + 同周期 + 同周期开始日”幂等写入或覆盖日记。
 */
export async function upsertMemoryDiary(input: MemoryDiaryWriteInput): Promise<IMemoryDiary> {
  const period = input.period ?? "day";
  const diaryDate = normalizeDiaryDate(input.diaryDate);
  let diaryEndDate = input.diaryEndDate;
  if (!diaryEndDate) {
    if (period === "day") {
      diaryEndDate = diaryDate;
    } else if (period === "week") {
      diaryEndDate = dayjs(diaryDate).add(6, "day").toDate();
    } else if (period === "month") {
      diaryEndDate = dayjs(diaryDate).endOf("month").startOf("day").toDate();
    } else {
      diaryEndDate = dayjs(diaryDate).endOf("year").startOf("day").toDate();
    }
  }
  const now = new Date();
  const model = await getMemoryDiaryModel();

  const diary = await model
    .findOneAndUpdate(
      {
        subject: input.subject,
        period,
        diaryDate,
        isDev: input.isDev ?? false,
      },
      {
        $set: {
          diaryEndDate,
          text: input.text,
          generatedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          subject: input.subject,
          period,
          diaryDate,
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

  if (!diary) {
    throw new Error("upsertMemoryDiary failed");
  }

  await syncMemoryDiaryDocument(diary);
  return diary;
}

/**
 * 查询 Diary 条目。
 *
 * 说明：
 * - 区间查询要求 Diary 期间完整落在 startDate / endDate 范围内；
 * - startDate 和 endDate 都是闭区间边界。
 */
export async function getMemoryDiaries(
  options: GetMemoryDiariesOptions = {},
): Promise<IMemoryDiary[]> {
  const filter = buildMemoryDiaryFilter(options);
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;
  const model = await getMemoryDiaryModel(options.readFrom);

  return await model
    .find(filter)
    .sort({ diaryDate: sortDirection, updatedAt: sortDirection })
    .skip(Math.max(0, options.skip ?? 0))
    .limit(options.limit ?? 10)
    .exec();
}

/**
 * 统计 Diary 条目总数。
 *
 * 说明：
 * - 与列表查询复用同一套 filter 构建逻辑，确保分页总数与列表结果一致。
 */
export async function countMemoryDiaries(options: GetMemoryDiariesOptions = {}): Promise<number> {
  const model = await getMemoryDiaryModel(options.readFrom);
  return await model.countDocuments(buildMemoryDiaryFilter(options)).exec();
}

async function syncMemoryDiaryDocument(diary: IMemoryDiary): Promise<void> {
  if (!hasSyncMongoUri()) {
    return;
  }

  try {
    const syncModel = await getMemoryDiaryModel("sync");
    await syncModel
      .replaceOne(
        {
          subject: diary.subject,
          period: diary.period,
          diaryDate: diary.diaryDate,
          isDev: diary.isDev,
        },
        {
          _id: diary._id,
          subject: diary.subject,
          period: diary.period,
          diaryDate: diary.diaryDate,
          diaryEndDate: diary.diaryEndDate,
          text: diary.text,
          generatedAt: diary.generatedAt,
          updatedAt: diary.updatedAt,
          isDev: diary.isDev,
        },
        { upsert: true },
      )
      .exec();
  } catch (error) {
    console.error(`Sync Mongo write failed: memory_diary ${diary._id}`, error);
  }
}
