import { getMongoConnection } from "@yuiju/utils/db/connect";
import { getMemoryDiaries } from "@yuiju/utils/db/operations/memory-diary";
import { DEFAULT_DIARY_SUBJECT } from "@yuiju/utils/memory/diary";
import { indexDailyDiary } from "@yuiju/utils/memory/diary-vector-index";
import { formatProjectTime } from "@yuiju/utils/time";
import dayjs from "dayjs";

export async function main() {
  if (process.env.NODE_ENV !== "production") {
    throw new Error("日记向量回填必须在 production 环境执行");
  }

  const startDate = dayjs().subtract(14, "day").startOf("day").toDate();
  const endDate = dayjs().subtract(1, "day").startOf("day").toDate();
  const connection = await getMongoConnection();

  try {
    const diaries = await getMemoryDiaries({
      subject: DEFAULT_DIARY_SUBJECT,
      period: "day",
      isDev: false,
      startDate,
      endDate,
      sortDirection: "asc",
      limit: 14,
    });

    console.info(
      `[diary-vector-backfill] ${formatProjectTime(startDate, "YYYY-MM-DD")}~${formatProjectTime(endDate, "YYYY-MM-DD")}，共 ${diaries.length} 篇`,
    );

    for (const diary of diaries) {
      await indexDailyDiary(diary);
      console.info(
        `[diary-vector-backfill] 已写入 ${formatProjectTime(diary.diaryDate, "YYYY-MM-DD")}`,
      );
    }

    console.info(`[diary-vector-backfill] 完成，共写入 ${diaries.length} 篇`);
  } finally {
    await connection.close();
  }
}
