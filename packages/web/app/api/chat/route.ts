export const runtime = "nodejs";

export function POST() {
  return Response.json(
    {
      error: {
        code: "CHAT_ENDPOINT_MOVED",
        message: "请使用 /api/chat/messages 发送 Web 私聊消息",
      },
    },
    { status: 410 },
  );
}
