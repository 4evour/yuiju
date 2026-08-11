import { embedTexts } from "@yuiju/utils/llm/embedding";
import { memoryRetrievalCacheEmbeddingInstruction } from "@yuiju/utils/prompt/memory-retrieval";
import { getRedis } from "@yuiju/utils/redis/client";
import { formatProjectTime, parseProjectTime } from "@yuiju/utils/time";
import dayjs from "dayjs";
import type { HistoryMessageSegment } from "@/utils/message/types";

const MEMORY_RETRIEVAL_CACHE_SIMILARITY_THRESHOLD = 0.95;

interface MemoryRetrievalCacheEntry {
  embedding: number[];
  memory: string;
}

export interface MemoryRetrievalCacheLookup {
  embedding: number[];
  memory: string | null;
  similarity: number | null;
}

function buildMemoryRetrievalCacheKey(userId: string): string {
  const projectDate = formatProjectTime(new Date(), "YYYY-MM-DD");
  return `message:memory-retrieval-cache:${projectDate}:${userId}`;
}

function calculateCosineSimilarity(left: number[], right: number[]): number {
  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export async function findMemoryRetrievalCache(input: {
  userId: string;
  messageContent: HistoryMessageSegment[];
}): Promise<MemoryRetrievalCacheLookup> {
  const [[embedding], rawEntries] = await Promise.all([
    embedTexts([
      `Instruct: ${memoryRetrievalCacheEmbeddingInstruction}\nQuery: ${JSON.stringify(input.messageContent)}`,
    ]),
    getRedis().lrange(buildMemoryRetrievalCacheKey(input.userId), 0, -1),
  ]);
  const entries = rawEntries.map((rawEntry) => JSON.parse(rawEntry) as MemoryRetrievalCacheEntry);
  let matchedMemory: string | null = null;
  let highestSimilarity: number | null = null;

  for (const entry of entries) {
    const similarity = calculateCosineSimilarity(embedding, entry.embedding);
    if (highestSimilarity === null || similarity > highestSimilarity) {
      matchedMemory = entry.memory;
      highestSimilarity = similarity;
    }
  }

  return {
    embedding,
    memory:
      highestSimilarity !== null && highestSimilarity >= MEMORY_RETRIEVAL_CACHE_SIMILARITY_THRESHOLD
        ? matchedMemory
        : null,
    similarity: highestSimilarity,
  };
}

export async function saveMemoryRetrievalCache(input: {
  userId: string;
  embedding: number[];
  memory: string;
}): Promise<void> {
  const redisKey = buildMemoryRetrievalCacheKey(input.userId);
  const projectDate = formatProjectTime(new Date(), "YYYY-MM-DD");
  const nextProjectDate = dayjs(projectDate).add(1, "day").format("YYYY-MM-DD");
  const expiresAt = parseProjectTime(nextProjectDate, "YYYY-MM-DD")!;

  await getRedis()
    .multi()
    .rpush(
      redisKey,
      JSON.stringify({
        embedding: input.embedding,
        memory: input.memory,
      } satisfies MemoryRetrievalCacheEntry),
    )
    .expireat(redisKey, Math.floor(expiresAt.getTime() / 1000))
    .exec();
}
