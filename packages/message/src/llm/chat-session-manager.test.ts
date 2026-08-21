import { describe, expect, it, vi } from "vitest";

vi.mock("@yuiju/utils", () => ({
  buildMessageSummaryPrompt: vi.fn(),
  flashModel: {},
  getTimeWithWeekday: vi.fn(),
  isDev: () => true,
  saveMemoryEpisode: vi.fn(),
  summarizeConversationMessages: vi.fn(),
}));

vi.mock("@yuiju/utils/llm/langfuse-telemetry", () => ({
  getLangfuseTelemetry: vi.fn(),
}));

vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("../memory/group-memory", () => ({ updateGroupMemoryForChatWindow: vi.fn() }));
vi.mock("../memory/person-memory", () => ({
  writePersonMemoryUpdatesForGroupChatWindow: vi.fn(),
  writePersonMemoryUpdatesForPrivateChatWindow: vi.fn(),
}));

import type { StoredSatoriPrivateMessage } from "../utils/message/types";
import {
  ChatSessionManager,
  type EpisodeWindowState,
  type RollingSummaryChunkState,
} from "./chat-session-manager";

interface ChatSessionManagerInternals {
  enqueueSummaryRefresh(
    sessionId: string,
    state: RollingSummaryChunkState<StoredSatoriPrivateMessage>,
  ): Promise<void>;
  finalizeEpisodeWindow(state: EpisodeWindowState<StoredSatoriPrivateMessage>): Promise<void>;
}

function createPrivateMessage(messageId: string, timestamp: number): StoredSatoriPrivateMessage {
  return {
    source: "satori",
    scene: "private",
    platform: "web",
    messageId,
    channelId: "local-owner",
    sessionId: "private:web:local-owner",
    sessionLabel: "主人",
    sender: {
      id: "local-owner",
      displayName: "主人",
      isSelf: false,
    },
    timestamp,
    elements: [],
    content: [{ type: "text", data: { text: messageId } }],
  };
}

describe("ChatSessionManager.flushUserWindow", () => {
  it("does not flush messages that arrive while the previous window is being archived", async () => {
    const sessionId = "private:web:local-owner";
    const manager = new ChatSessionManager<StoredSatoriPrivateMessage>({
      sceneLabel: "private",
      options: {
        conversationLimit: 20,
        conversationTtlMs: 8 * 60 * 60 * 1000,
        summaryFlushMessageCount: 15,
        summaryFlushIdleMs: 30 * 60 * 1000,
        episodeIdleMs: 12 * 60 * 60 * 1000,
        episodeMessageCountLimit: 30,
      },
    });
    let releaseSummaryRefresh: () => void = vi.fn();
    const summaryRefreshBlocked = new Promise<void>((resolve) => {
      releaseSummaryRefresh = resolve;
    });
    const managerInternals = manager as unknown as ChatSessionManagerInternals;
    const enqueueSummaryRefresh = vi
      .spyOn(managerInternals, "enqueueSummaryRefresh")
      .mockImplementation(async () => {
        await summaryRefreshBlocked;
      });
    const finalizeEpisodeWindow = vi
      .spyOn(managerInternals, "finalizeEpisodeWindow")
      .mockResolvedValue(undefined);

    manager.recordMessage({
      sessionId,
      sessionLabel: "主人",
      message: createPrivateMessage("first", 1),
    });

    const firstFlush = manager.flushUserWindow(sessionId);
    await vi.waitFor(() => expect(enqueueSummaryRefresh).toHaveBeenCalledTimes(1));

    manager.recordMessage({
      sessionId,
      sessionLabel: "主人",
      message: createPrivateMessage("second", 2),
    });
    releaseSummaryRefresh();
    await firstFlush;

    expect(finalizeEpisodeWindow).toHaveBeenCalledTimes(1);
    expect(finalizeEpisodeWindow.mock.calls[0][0].messages).toEqual([
      expect.objectContaining({ messageId: "first" }),
    ]);

    await manager.flushUserWindow(sessionId);

    expect(finalizeEpisodeWindow).toHaveBeenCalledTimes(2);
    expect(finalizeEpisodeWindow.mock.calls[1][0].messages).toEqual([
      expect.objectContaining({ messageId: "second" }),
    ]);
  });
});
