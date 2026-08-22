import "server-only";

import { getYuijuConfig } from "@yuiju/utils/config/config";
import {
  type WebChatHistoryPage,
  type WebChatHistoryQuery,
  type WebChatMessageInput,
  type WebChatResult,
  webChatHistoryPageSchema,
  webChatResultSchema,
} from "@yuiju/utils/types/web-chat";

function getMessageInternalApiUrl(pathname: string): URL {
  const { host, port } = getYuijuConfig().message.internalApi;
  return new URL(pathname, `http://${host}:${port}`);
}

export async function sendWebChatMessage(input: WebChatMessageInput): Promise<WebChatResult> {
  const response = await fetch(getMessageInternalApiUrl("/internal/web/messages"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`message internal API returned ${response.status}`);
  }

  return webChatResultSchema.parse(await response.json());
}

export async function fetchWebChatHistory(query: WebChatHistoryQuery): Promise<WebChatHistoryPage> {
  const url = getMessageInternalApiUrl("/internal/web/messages");
  url.searchParams.set("limit", String(query.limit));
  if (query.cursor) {
    url.searchParams.set("cursorSentAt", String(query.cursor.sentAt));
    url.searchParams.set("cursorId", query.cursor.id);
  }
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`message internal API returned ${response.status}`);
  }

  return webChatHistoryPageSchema.parse(await response.json());
}

export function fetchWebChatSticker(key: string): Promise<Response> {
  return fetch(getMessageInternalApiUrl(`/internal/web/stickers/${encodeURIComponent(key)}`), {
    cache: "no-store",
  });
}
