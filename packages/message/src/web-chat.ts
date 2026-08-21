import { extname } from "node:path";
import { h } from "@satorijs/core";
import { SUBJECT_NAME } from "@yuiju/utils";
import { getYuijuConfig } from "@yuiju/utils/config/config";
import { llmManager } from "./llm/manager";
import { stickerState } from "./state/sticker";
import { buildSatoriPrivateSessionKey } from "./utils/message/session-key";
import type { HistoryMessageSegment, StoredSatoriPrivateMessage } from "./utils/message/types";

export interface WebChatMessageInput {
  messageId: string;
  text: string;
  sentAt: number;
}

export type WebChatReplyPart =
  | { type: "text"; text: string }
  | { type: "sticker"; key: string; url: string };

export type WebChatResult =
  | {
      status: "replied";
      reply: {
        id: string;
        parts: WebChatReplyPart[];
        createdAt: number;
      };
    }
  | { status: "no-reply" }
  | { status: "failed" }
  | { status: "superseded" };

let stickerInitialization: Promise<void> | null = null;

function ensureStickerStateInitialized(): Promise<void> {
  stickerInitialization ??= stickerState.initialize();
  return stickerInitialization;
}

function createWebPrivateMessage(input: WebChatMessageInput): StoredSatoriPrivateMessage {
  const { ownerId, ownerName } = getYuijuConfig().message.web;
  const sessionId = buildSatoriPrivateSessionKey("web", ownerId);

  return {
    source: "satori",
    scene: "private",
    platform: "web",
    messageId: input.messageId,
    channelId: ownerId,
    sessionId,
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
  await ensureStickerStateInitialized();

  const sourceMessage = createWebPrivateMessage(input);
  llmManager.recordPrivateMessage(sourceMessage);

  const result = await llmManager.chatWithLLM(sourceMessage);
  if (result.status === "cancelled") {
    return { status: "superseded" };
  }
  if (result.status === "failed") {
    return { status: "failed" };
  }
  if (!result.shouldReply || !result.reply.trim()) {
    await llmManager.flushPrivateChatSession(sourceMessage.sessionId);
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
    const storedReply: StoredSatoriPrivateMessage = {
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
    };
    llmManager.recordPrivateMessage(storedReply);
  }

  await llmManager.flushPrivateChatSession(sourceMessage.sessionId);

  return {
    status: "replied",
    reply: {
      id: `${input.messageId}:reply`,
      parts,
      createdAt,
    },
  };
}

export async function getWebChatSticker(key: string) {
  await ensureStickerStateInitialized();
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
