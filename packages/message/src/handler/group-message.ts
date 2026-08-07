import type { Session } from "@satorijs/core";
import { ActionId, getYuijuConfig, initCharacterStateData } from "@yuiju/utils";
import { llmManager } from "@/llm/manager";
import { logger } from "@/utils/logger";
import {
  createStoredSatoriGroupMessage,
  type StoredSatoriGroupMessage,
  sendAndRecordSatoriGroupReply,
} from "@/utils/message";

let isCloseGroup = false;
const config = getYuijuConfig();

export const closeGroupMessage = () => {
  isCloseGroup = true;
};

export const openGroupMessage = () => {
  isCloseGroup = false;
};

export async function groupMessageHandler(session: Session) {
  if (isCloseGroup) {
    return;
  }

  const sessionGroupId = session.guildId ?? session.channelId;
  if (!sessionGroupId) {
    return;
  }

  if (session.platform === "onebot") {
    const groupId = Number(sessionGroupId);
    if (!Number.isInteger(groupId) || !config.message.onebot.groupWhiteList.includes(groupId)) {
      return;
    }
  } else if (session.platform === "lark") {
    if (!config.message.lark.groupWhiteList.includes(sessionGroupId)) {
      return;
    }
  } else {
    return;
  }

  const storedMessage = await createStoredSatoriGroupMessage(session);
  if (!storedMessage) {
    return;
  }
  if (storedMessage.sender.isSelf) {
    return;
  }

  logger.info("[message.receive.group] 收到群消息", {
    platform: storedMessage.platform,
    groupName: storedMessage.sessionLabel,
    sender: storedMessage.sender.displayName,
    messageId: storedMessage.messageId,
    content: storedMessage.content,
  });

  llmManager.recordGroupMessage(storedMessage);

  await replyToStoredGroupMessage({ session, storedMessage });
}

export async function replyToStoredGroupMessage(input: {
  session: Session;
  storedMessage: StoredSatoriGroupMessage;
}) {
  const { session, storedMessage } = input;

  const characterStateData = await initCharacterStateData();
  if (characterStateData.action === ActionId.Sleep) {
    return;
  }

  try {
    const groupChatResult = await llmManager.chatInGroup(storedMessage);
    if (groupChatResult.status === "cancelled") {
      logger.info("[message.reply.group] 群聊回复生成已取消，不发送消息", {
        sessionId: storedMessage.sessionId,
        groupName: storedMessage.sessionLabel,
        requestId: storedMessage.messageId,
      });
      return;
    }
    if (groupChatResult.status === "failed") {
      return;
    }

    if (!llmManager.isLatestGroupChatRequest(storedMessage.sessionId, groupChatResult.requestId)) {
      logger.info("[message.reply.group] 群聊回复结果已过期，不发送消息", {
        sessionId: storedMessage.sessionId,
        groupName: storedMessage.sessionLabel,
        requestId: groupChatResult.requestId,
      });
      return;
    }

    if (!groupChatResult.shouldReply) {
      logger.info("[message.reply.group] 不回复", {
        sessionId: storedMessage.sessionId,
        groupName: storedMessage.sessionLabel,
        requestId: groupChatResult.requestId,
        reason: groupChatResult.noReplyReason || "未提供原因",
      });
      return;
    }

    const reply = groupChatResult.reply.trim();
    if (!reply) {
      return;
    }

    await sendAndRecordSatoriGroupReply({
      session,
      sourceMessage: storedMessage,
      reply,
    });
  } catch (error) {
    logger.error("[message.reply.group] 处理群消息失败", error);
  }
}
