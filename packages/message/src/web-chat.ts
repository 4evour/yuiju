import { extname } from "node:path";
import { h } from "@satorijs/core";
import { getYuijuConfig } from "@yuiju/utils/config/config";
import { SUBJECT_NAME } from "@yuiju/utils/constants/character";
import type {
  WebChatMessageInput,
  WebChatReplyPart,
  WebChatResult,
} from "@yuiju/utils/types/web-chat";
import { llmManager } from "@/llm/manager";
import { stickerState } from "@/state/sticker";
import { buildSatoriPrivateSessionKey } from "@/utils/message/satori";
import type { HistoryMessageSegment, StoredSatoriPrivateMessage } from "@/utils/message/types";

function createWebPrivateMessage(input: WebChatMessageInput): StoredSatoriPrivateMessage {
  const { ownerId, ownerName } = getYuijuConfig().message.web;

  return {
    source: "satori",
    scene: "private",
    platform: "web",
    messageId: input.messageId,
    channelId: ownerId,
    sessionId: buildSatoriPrivateSessionKey("web", ownerId),
    sessionLabel: ownerName,
    sender: {
      id: ownerId,
      displayName: ownerName,
      isSelf: false,
    },
    timestamp: input.sentAt,
    elements: [h.text(input.text)],
    content: [{ type: "text", data: { text: input.text } }],
  };
}

function projectWebReplyContent(elements: h[]): HistoryMessageSegment[] {
  return elements.map((element) => {
    if (element.type === "text") {
      return { type: "text", data: { text: String(element.attrs.content ?? "") } };
    }

    const sticker = stickerState.getByKey(String(element.attrs.summary ?? ""));
    return {
      type: "image",
      data: { description: sticker?.description },
    };
  });
}

function appendWebReplyParts(parts: WebChatReplyPart[], elements: h[], needsLineBreak: boolean) {
  if (needsLineBreak && elements.length > 0) {
    parts.push({ type: "text", text: "\n" });
  }

  for (const element of elements) {
    if (element.type === "text") {
      parts.push({ type: "text", text: String(element.attrs.content ?? "") });
      continue;
    }

    if (element.type === "image") {
      const key = String(element.attrs.summary ?? "");
      parts.push({
        type: "sticker",
        key,
        url: `/api/chat/stickers/${encodeURIComponent(key)}`,
      });
    }
  }
}

export async function chatThroughWebChannel(input: WebChatMessageInput): Promise<WebChatResult> {
  const sourceMessage = createWebPrivateMessage(input);
  await llmManager.recordPrivateMessage(sourceMessage);

  const result = await llmManager.chatWithLLM(sourceMessage);
  if (result.status === "cancelled") {
    return { status: "superseded" };
  }
  if (result.status === "failed") {
    return { status: "failed" };
  }
  if (!llmManager.isLatestPrivateChatRequest(sourceMessage.sessionId, result.requestId)) {
    return { status: "superseded" };
  }
  if (!result.shouldReply || !result.reply.trim()) {
    return { status: "no-reply" };
  }

  const parts: WebChatReplyPart[] = [];
  const replyLines = result.reply.split("\n").filter((line) => line.trim().length > 0);
  const createdAt = Date.now();

  for (const [lineIndex, line] of replyLines.entries()) {
    const elements = stickerState.buildSatoriElementsFromLine(line);
    if (!elements.length) {
      continue;
    }

    appendWebReplyParts(parts, elements, parts.length > 0);
    await llmManager.recordPrivateMessage({
      ...sourceMessage,
      messageId: `${input.messageId}:reply:${lineIndex}`,
      sender: {
        id: "web:yuiju",
        displayName: SUBJECT_NAME,
        isSelf: true,
      },
      elements,
      timestamp: createdAt,
      content: projectWebReplyContent(elements),
    });
  }

  return {
    status: "replied",
    reply: {
      id: `${input.messageId}:reply`,
      parts,
      createdAt,
    },
  };
}

export function getWebChatSticker(key: string) {
  const sticker = stickerState.getByKey(key);
  if (!sticker) {
    return null;
  }

  const extension = extname(sticker.absoluteUri).toLowerCase();
  if (extension !== ".png" && extension !== ".webp") {
    throw new Error(`unsupported Web sticker format: ${extension}`);
  }

  return {
    fileBuffer: sticker.fileBuffer,
    contentType: extension === ".png" ? "image/png" : "image/webp",
  };
}
