import type { Session } from "@satorijs/core";
import { getYuijuConfig } from "@yuiju/utils";
import { llmManager } from "@/llm/manager";
import { logger } from "@/utils/logger";
import {
  createStoredSatoriPrivateMessage,
  getProtocolMessageSenderName,
  type StoredSatoriPrivateMessage,
  sendAndRecordSatoriPrivateReply,
} from "@/utils/message";
import { closeGroupMessage, openGroupMessage } from "./group-message";

const config = getYuijuConfig();

function groupMessageAction(action?: string) {
  if (action === "/关闭") {
    closeGroupMessage();
    return true;
  }
  if (action === "/开启") {
    openGroupMessage();
    return true;
  }
  return false;
}

export async function privateMessageHandler(session: Session) {
  if (!session.isDirect) {
    return;
  }

  if (!session.content) {
    return;
  }

  const userId = session.userId || session.event.user?.id;
  if (!userId) {
    return;
  }

  if (session.platform === "onebot") {
    const qq = Number(userId);
    if (!Number.isInteger(qq) || !config.message.onebot.ownerList.includes(qq)) {
      return;
    }
  } else if (session.platform === "lark") {
    if (
      !config.message.lark.ownerList.includes(userId) &&
      !config.message.lark.whiteList.includes(userId)
    ) {
      return;
    }
  } else {
    return;
  }

  // 权限控制
  if (config.message.lark.ownerList.includes(userId) && groupMessageAction(session.content)) {
    return;
  }

  try {
    const storedMessage = await createStoredSatoriPrivateMessage(session);
    if (!storedMessage || storedMessage.sender.isSelf) {
      return;
    }

    const sessionLabel = getProtocolMessageSenderName(storedMessage);

    logger.info("[message.receive.private] 收到私聊消息", {
      platform: storedMessage.platform,
      sender: sessionLabel,
      messageId: storedMessage.messageId,
      content: storedMessage.content,
    });

    llmManager.recordPrivateMessage(storedMessage, sessionLabel);

    await replyToStoredPrivateMessage({ session, storedMessage, userId });
  } catch (error) {
    logger.error("[message.reply.private] 处理私聊消息失败", error);
  }
}

export async function replyToStoredPrivateMessage(input: {
  session: Session;
  storedMessage: StoredSatoriPrivateMessage;
  userId: string;
}) {
  const { session, storedMessage, userId } = input;
  const sessionLabel = getProtocolMessageSenderName(storedMessage);

  try {
    const chatResult = await llmManager.chatWithLLM(storedMessage);
    if (chatResult.status === "cancelled") {
      logger.info("[message.reply.private] 私聊回复生成已取消，不发送消息", {
        sessionId: storedMessage.sessionId,
        sessionLabel,
        requestId: storedMessage.messageId,
      });
      return;
    }
    if (chatResult.status === "failed") {
      return;
    }

    if (!llmManager.isLatestPrivateChatRequest(storedMessage.sessionId, chatResult.requestId)) {
      logger.info("[message.reply.private] 私聊回复结果已过期，不发送消息", {
        sessionId: storedMessage.sessionId,
        sessionLabel,
        requestId: chatResult.requestId,
      });
      return;
    }

    if (!chatResult.shouldReply) {
      logger.info("[message.reply.private] 不回复", {
        userId,
        sessionLabel,
        reason: chatResult.noReplyReason || "未提供原因",
      });
      return;
    }

    const reply = chatResult.reply.trim();
    if (!reply) {
      return;
    }

    await sendAndRecordSatoriPrivateReply({
      session,
      sourceMessage: storedMessage,
      reply,
    });
  } catch (error) {
    logger.error("[message.reply.private] 处理私聊消息失败", error);
  }
}
