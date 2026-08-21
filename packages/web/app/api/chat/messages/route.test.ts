import { chatThroughWebChannel } from "@yuiju/message/web-chat";
import { getYuijuConfig } from "@yuiju/utils/config/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicDeployment } from "@/lib/public-deployment";
import { POST } from "./route";

vi.mock("@yuiju/message/web-chat", () => ({
  chatThroughWebChannel: vi.fn(),
}));
vi.mock("@yuiju/utils/config/config", () => ({
  getYuijuConfig: vi.fn(),
}));
vi.mock("@/lib/public-deployment", () => ({
  isPublicDeployment: vi.fn(),
}));

const validMessage = {
  messageId: "message-1",
  text: "你好",
  sentAt: 1_775_856_600_000,
};

function createRequest(body: BodyInit): Request {
  return new Request("http://localhost/api/chat/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/chat/messages", () => {
  beforeEach(() => {
    vi.mocked(isPublicDeployment).mockReturnValue(false);
    vi.mocked(getYuijuConfig).mockReturnValue({
      message: { web: { enabled: true } },
    } as ReturnType<typeof getYuijuConfig>);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(createRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_MESSAGE", message: "请求体必须是有效 JSON" },
    });
    expect(chatThroughWebChannel).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { ...validMessage, messageId: " " },
    { ...validMessage, messageId: "a".repeat(121) },
    { ...validMessage, text: " " },
    { ...validMessage, text: "a".repeat(2001) },
    { ...validMessage, sentAt: 0 },
    { ...validMessage, sentAt: 1.5 },
  ])("rejects an invalid message payload: %j", async (body) => {
    const response = await POST(createRequest(JSON.stringify(body)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_MESSAGE", message: "消息格式不正确" },
    });
    expect(chatThroughWebChannel).not.toHaveBeenCalled();
  });

  it("rejects chat in a public deployment", async () => {
    vi.mocked(isPublicDeployment).mockReturnValue(true);

    const response = await POST(createRequest(JSON.stringify(validMessage)));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "CHAT_DISABLED", message: "Web 私聊渠道未启用" },
    });
    expect(chatThroughWebChannel).not.toHaveBeenCalled();
  });

  it("rejects chat when the Web channel is disabled", async () => {
    vi.mocked(getYuijuConfig).mockReturnValue({
      message: { web: { enabled: false } },
    } as ReturnType<typeof getYuijuConfig>);

    const response = await POST(createRequest(JSON.stringify(validMessage)));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "CHAT_DISABLED", message: "Web 私聊渠道未启用" },
    });
    expect(chatThroughWebChannel).not.toHaveBeenCalled();
  });

  it("trims valid input and returns a reply", async () => {
    const reply = {
      id: "message-1:reply",
      parts: [
        { type: "text" as const, text: "你好呀" },
        { type: "sticker" as const, key: "wave", url: "/api/chat/stickers/wave" },
      ],
      createdAt: 1_775_856_601_000,
    };
    vi.mocked(chatThroughWebChannel).mockResolvedValue({ status: "replied", reply });

    const response = await POST(
      createRequest(
        JSON.stringify({
          ...validMessage,
          messageId: "  message-1  ",
          text: "  你好  ",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(chatThroughWebChannel).toHaveBeenCalledWith(validMessage);
    await expect(response.json()).resolves.toEqual({
      data: { status: "REPLIED", reply },
    });
  });

  it.each([
    ["no-reply", 200, { data: { status: "NO_REPLY" } }],
    ["failed", 500, { error: { code: "CHAT_FAILED", message: "悠酱暂时无法组织回复" } }],
    [
      "superseded",
      409,
      { error: { code: "MESSAGE_SUPERSEDED", message: "这条消息已被更新的消息替代" } },
    ],
  ] as const)("maps a %s channel result to HTTP %s", async (status, expectedStatus, payload) => {
    vi.mocked(chatThroughWebChannel).mockResolvedValue({ status });

    const response = await POST(createRequest(JSON.stringify(validMessage)));

    expect(response.status).toBe(expectedStatus);
    await expect(response.json()).resolves.toEqual(payload);
  });
});
