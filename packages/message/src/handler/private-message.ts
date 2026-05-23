import type { Session } from "@satorijs/core";
import { getYuijuConfig } from "@yuiju/utils";
import { llmManager } from "@/llm/manager";
import { logger } from "@/utils/logger";
import {
  createStoredSatoriPrivateMessage,
  getProtocolMessageSenderName,
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

  if (groupMessageAction(session.content)) {
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
    if (!Number.isInteger(qq) || !config.message.onebot.whiteList.includes(qq)) {
      return;
    }
  } else if (session.platform === "lark") {
    if (!config.message.lark.whiteList.includes(userId)) {
      return;
    }
  } else {
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
    const chatResult = await llmManager.chatWithLLM(storedMessage);
    if (chatResult.status === "failed") {
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
