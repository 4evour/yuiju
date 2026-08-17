import { chatThroughWebChannel } from "@yuiju/message/web-chat";
import { getYuijuConfig } from "@yuiju/utils";
import { isPublicDeployment } from "@/lib/public-deployment";

export const runtime = "nodejs";
export const maxDuration = 120;

type ChatErrorCode = "INVALID_MESSAGE" | "CHAT_DISABLED" | "CHAT_FAILED" | "MESSAGE_SUPERSEDED";

function errorResponse(status: number, code: ChatErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function readMessageInput(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const messageId = typeof payload.messageId === "string" ? payload.messageId.trim() : "";
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const sentAt = payload.sentAt;

  if (
    !messageId ||
    messageId.length > 120 ||
    !text ||
    text.length > 2000 ||
    typeof sentAt !== "number" ||
    !Number.isInteger(sentAt) ||
    sentAt <= 0
  ) {
    return null;
  }

  return { messageId, text, sentAt };
}

export async function POST(request: Request) {
  if (isPublicDeployment() || !getYuijuConfig().message.web.enabled) {
    return errorResponse(403, "CHAT_DISABLED", "Web 私聊渠道未启用");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_MESSAGE", "请求体必须是有效 JSON");
  }

  const input = readMessageInput(body);
  if (!input) {
    return errorResponse(400, "INVALID_MESSAGE", "消息格式不正确");
  }

  const result = await chatThroughWebChannel(input);
  if (result.status === "failed") {
    return errorResponse(500, "CHAT_FAILED", "悠酱暂时无法组织回复");
  }
  if (result.status === "superseded") {
    return errorResponse(409, "MESSAGE_SUPERSEDED", "这条消息已被更新的消息替代");
  }
  if (result.status === "no-reply") {
    return Response.json({ data: { status: "NO_REPLY" } });
  }

  return Response.json({
    data: {
      status: "REPLIED",
      reply: result.reply,
    },
  });
}
