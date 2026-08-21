import { getYuijuConfig } from "@yuiju/utils/config/config";
import {
  countRecentMemoryEpisodes,
  getRecentMemoryEpisodes,
} from "@yuiju/utils/db/operations/memory-episode";
import { isDev } from "@yuiju/utils/env";
import { listPersonMemories } from "@yuiju/utils/memory/person-memory/directory";
import { readPersonMemoryHeatDocument } from "@yuiju/utils/memory/person-memory/heat";
import { getRedis } from "@yuiju/utils/redis/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSettingsSnapshot } from "./settings-data";

vi.mock("@yuiju/utils/config/config", () => ({ getYuijuConfig: vi.fn() }));
vi.mock("@yuiju/utils/db/operations/memory-episode", () => ({
  countRecentMemoryEpisodes: vi.fn(),
  getRecentMemoryEpisodes: vi.fn(),
}));
vi.mock("@yuiju/utils/env", () => ({ isDev: vi.fn() }));
vi.mock("@yuiju/utils/memory/person-memory/directory", () => ({
  listPersonMemories: vi.fn(),
}));
vi.mock("@yuiju/utils/memory/person-memory/heat", () => ({
  readPersonMemoryHeatDocument: vi.fn(),
}));
vi.mock("@yuiju/utils/redis/client", () => ({ getRedis: vi.fn() }));

const generatedAt = "2026-08-22T06:30:00.000Z";
const latestArchiveAt = "2026-08-21T09:15:00.000Z";
const ping = vi.fn();

describe("getSettingsSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(generatedAt));
    vi.mocked(getYuijuConfig).mockReturnValue({
      message: {
        web: {
          enabled: true,
          ownerName: "本地用户",
        },
      },
      llm: {
        models: {
          chat: [{ model: "test-chat-model", apiKey: "secret-value" }],
        },
      },
    } as unknown as ReturnType<typeof getYuijuConfig>);
    vi.mocked(isDev).mockReturnValue(true);
    vi.mocked(countRecentMemoryEpisodes).mockResolvedValue(12);
    vi.mocked(getRecentMemoryEpisodes).mockResolvedValue([
      { createdAt: new Date(latestArchiveAt) },
    ] as Awaited<ReturnType<typeof getRecentMemoryEpisodes>>);
    ping.mockResolvedValue("PONG");
    vi.mocked(getRedis).mockReturnValue({ ping } as unknown as ReturnType<typeof getRedis>);
    vi.mocked(listPersonMemories).mockResolvedValue({
      items: ["本地用户"],
      page_number: 1,
      total: 4,
      hasMore: false,
    });
    vi.mocked(readPersonMemoryHeatDocument).mockResolvedValue({
      本地用户: { heat: 27, lastInteractedAt: latestArchiveAt },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the public settings projection when every dependency is online", async () => {
    const snapshot = await getSettingsSnapshot();

    expect(snapshot).toEqual({
      generatedAt,
      environment: "development",
      chat: {
        enabled: true,
        identity: "本地用户",
        model: "test-chat-model",
      },
      mongo: {
        status: "online",
        episodeCount: 12,
        latestArchiveAt,
      },
      redis: { status: "online" },
      personMemory: {
        status: "online",
        count: 4,
        interactionHeat: 27,
      },
    });
    expect(countRecentMemoryEpisodes).toHaveBeenCalledWith({
      sources: ["chat"],
      types: ["conversation"],
    });
    expect(getRecentMemoryEpisodes).toHaveBeenCalledWith({
      sources: ["chat"],
      types: ["conversation"],
      limit: 1,
      sortField: "createdAt",
    });
    expect(listPersonMemories).toHaveBeenCalledWith(1);
    expect(JSON.stringify(snapshot)).not.toContain("secret-value");
  });

  it("marks only MongoDB offline when its read fails", async () => {
    vi.mocked(countRecentMemoryEpisodes).mockRejectedValue(new Error("mongo unavailable"));

    const snapshot = await getSettingsSnapshot();

    expect(snapshot.mongo).toEqual({
      status: "offline",
      episodeCount: null,
      latestArchiveAt: null,
    });
    expect(snapshot.redis).toEqual({ status: "online" });
    expect(snapshot.personMemory.status).toBe("online");
  });

  it("marks only Redis offline when ping fails", async () => {
    ping.mockRejectedValue(new Error("redis unavailable"));

    const snapshot = await getSettingsSnapshot();

    expect(snapshot.mongo.status).toBe("online");
    expect(snapshot.redis).toEqual({ status: "offline" });
    expect(snapshot.personMemory.status).toBe("online");
  });

  it("marks only person memory offline when its read fails", async () => {
    vi.mocked(listPersonMemories).mockRejectedValue(new Error("memory unavailable"));

    const snapshot = await getSettingsSnapshot();

    expect(snapshot.mongo.status).toBe("online");
    expect(snapshot.redis).toEqual({ status: "online" });
    expect(snapshot.personMemory).toEqual({
      status: "offline",
      count: null,
      interactionHeat: null,
    });
  });
});
