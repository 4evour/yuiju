import { createHash } from "node:crypto";
import { getQdrantClient, hasQdrantClient } from "../db/qdrant";
import type { IMemoryDiary } from "../db/schema/memory-diary.schema";
import { embedTexts, hasEmbeddingModel } from "../llm/embedding";
import { formatProjectTime } from "../time";

const DAILY_DIARY_COLLECTION_NAME = "memory_diary_chunk";

function buildPointId(diaryId: string, chunkIndex: number): string {
  const hex = createHash("sha256").update(`${diaryId}:${chunkIndex}`).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

async function ensureDailyDiaryCollection(vectorSize: number): Promise<void> {
  const client = getQdrantClient();
  const collection = await client.collectionExists(DAILY_DIARY_COLLECTION_NAME);
  if (collection.exists) {
    return;
  }

  await client.createCollection(DAILY_DIARY_COLLECTION_NAME, {
    vectors: {
      size: vectorSize,
      distance: "Cosine",
    },
  });
  await Promise.all([
    client.createPayloadIndex(DAILY_DIARY_COLLECTION_NAME, {
      field_name: "diaryId",
      field_schema: "keyword",
      wait: true,
    }),
    client.createPayloadIndex(DAILY_DIARY_COLLECTION_NAME, {
      field_name: "chunkIndex",
      field_schema: "integer",
      wait: true,
    }),
  ]);
}

export async function indexDailyDiary(diary: IMemoryDiary): Promise<void> {
  if (!hasEmbeddingModel() || !hasQdrantClient()) {
    return;
  }

  const chunks = diary.text
    .split(/\n\s*\n/u)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
  const diaryDate = formatProjectTime(diary.diaryDate, "YYYY-MM-DD");
  const embeddings = await embedTexts(chunks.map((content) => `${diaryDate}\n${content}`));
  const diaryId = diary._id.toString();
  const client = getQdrantClient();

  await ensureDailyDiaryCollection(embeddings[0].length);
  await client.upsert(DAILY_DIARY_COLLECTION_NAME, {
    wait: true,
    points: chunks.map((content, chunkIndex) => ({
      id: buildPointId(diaryId, chunkIndex),
      vector: embeddings[chunkIndex],
      payload: {
        diaryId,
        chunkIndex,
        content,
        subject: diary.subject,
        period: diary.period,
        diaryDate: diary.diaryDate.toISOString(),
        diaryEndDate: diary.diaryEndDate.toISOString(),
        isDev: diary.isDev,
      },
    })),
  });
  await client.delete(DAILY_DIARY_COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [
        {
          key: "diaryId",
          match: { value: diaryId },
        },
        {
          key: "chunkIndex",
          range: { gte: chunks.length },
        },
      ],
    },
  });
}
