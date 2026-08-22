import { isDev } from "../env";
import { getRedis } from "./client";

export type ChatSessionBackupScene = "group" | "private";

export interface ChatSessionConversationBackup<TMessage> {
  updatedAt: number;
  messages: TMessage[];
}

export const REDIS_KEY_MESSAGE_GROUP_CONVERSATION_BACKUP = isDev()
  ? "dev:yuiju:message:group:conversation-backup"
  : "yuiju:message:group:conversation-backup";

export const REDIS_KEY_MESSAGE_PRIVATE_CONVERSATION_BACKUP = isDev()
  ? "dev:yuiju:message:private:conversation-backup"
  : "yuiju:message:private:conversation-backup";

function getConversationBackupRedisKey(scene: ChatSessionBackupScene): string {
  return scene === "group"
    ? REDIS_KEY_MESSAGE_GROUP_CONVERSATION_BACKUP
    : REDIS_KEY_MESSAGE_PRIVATE_CONVERSATION_BACKUP;
}

export async function saveChatSessionConversationBackup<TMessage>(input: {
  scene: ChatSessionBackupScene;
  sessionId: string;
  backup: ChatSessionConversationBackup<TMessage>;
}): Promise<void> {
  await getRedis().hset(
    getConversationBackupRedisKey(input.scene),
    input.sessionId,
    JSON.stringify(input.backup),
  );
}

export async function readChatSessionConversationBackups<TMessage>(
  scene: ChatSessionBackupScene,
): Promise<Record<string, ChatSessionConversationBackup<TMessage>>> {
  const backups = await getRedis().hgetall(getConversationBackupRedisKey(scene));

  return Object.fromEntries(
    Object.entries(backups).map(([sessionId, backup]) => [
      sessionId,
      JSON.parse(backup) as ChatSessionConversationBackup<TMessage>,
    ]),
  );
}

export async function deleteChatSessionConversationBackups(
  scene: ChatSessionBackupScene,
  sessionIds: string[],
): Promise<void> {
  await getRedis().hdel(getConversationBackupRedisKey(scene), ...sessionIds);
}
