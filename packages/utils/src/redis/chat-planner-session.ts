import type { ModelMessage } from "ai";
import { isDev } from "../env";
import { CHAT_SESSION_RECOVERY_MAX_IDLE_MS } from "./chat-session";
import { getRedis } from "./client";

export interface ChatPlannerTurn {
  realMessageIds: string[];
  messages: ModelMessage[];
  maxInputTokens: number;
}

export interface ChatPlannerSession {
  continuityMemo?: string;
  turns: ChatPlannerTurn[];
  lastProcessedMessageId?: string;
  updatedAt: number;
}

const REDIS_KEY = isDev()
  ? "dev:yuiju:message:chat-planner-session"
  : "yuiju:message:chat-planner-session";

export async function readChatPlannerSession(
  sessionId: string,
): Promise<ChatPlannerSession | null> {
  const value = await getRedis().hget(REDIS_KEY, sessionId);
  return value ? (JSON.parse(value) as ChatPlannerSession) : null;
}

export async function saveChatPlannerSession(
  sessionId: string,
  session: ChatPlannerSession,
): Promise<void> {
  await getRedis().hset(REDIS_KEY, sessionId, JSON.stringify(session));
}

export async function restoreChatPlannerSessions(): Promise<{
  restoredSessionCount: number;
  discardedSessionCount: number;
}> {
  const entries = Object.entries(await getRedis().hgetall(REDIS_KEY));
  const now = Date.now();
  const discardedSessionIds = entries.flatMap(([sessionId, value]) => {
    const session = JSON.parse(value) as ChatPlannerSession;
    return now - session.updatedAt > CHAT_SESSION_RECOVERY_MAX_IDLE_MS ? [sessionId] : [];
  });

  if (discardedSessionIds.length) {
    await getRedis().hdel(REDIS_KEY, ...discardedSessionIds);
  }

  return {
    restoredSessionCount: entries.length - discardedSessionIds.length,
    discardedSessionCount: discardedSessionIds.length,
  };
}
