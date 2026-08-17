import { beforeEach, describe, expect, it, vi } from "vitest";

const { embedTexts, getRedis } = vi.hoisted(() => ({
  embedTexts: vi.fn(),
  getRedis: vi.fn(),
}));

vi.mock("@yuiju/utils/llm/embedding", () => ({
  embedTexts,
  hasEmbeddingModel: () => false,
}));

vi.mock("@yuiju/utils/redis/client", () => ({ getRedis }));
vi.mock("@yuiju/utils/time", () => ({
  formatProjectTime: vi.fn(),
  parseProjectTime: vi.fn(),
}));

import { findMemoryRetrievalCache } from "./memory-retrieval-cache";

describe("findMemoryRetrievalCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the optional cache when no embedding model is configured", async () => {
    const result = await findMemoryRetrievalCache({
      userId: "local-owner",
      messageContent: [{ type: "text", data: { text: "晚上好" } }],
    });

    expect(result).toEqual({
      embedding: null,
      memory: null,
      similarity: null,
    });
    expect(embedTexts).not.toHaveBeenCalled();
    expect(getRedis).not.toHaveBeenCalled();
  });
});
