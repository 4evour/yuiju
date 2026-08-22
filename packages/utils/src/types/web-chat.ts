import { z } from "zod";

export const webChatMessageInputSchema = z.strictObject({
  messageId: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(2000),
  sentAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export type WebChatMessageInput = z.infer<typeof webChatMessageInputSchema>;

export const webChatReplyPartSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.strictObject({
    type: z.literal("sticker"),
    key: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    url: z.string().startsWith("/api/chat/stickers/"),
  }),
]);

export type WebChatReplyPart = z.infer<typeof webChatReplyPartSchema>;

export const webChatResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("replied"),
    reply: z.strictObject({
      id: z.string().min(1),
      parts: z.array(webChatReplyPartSchema).min(1),
      createdAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
  }),
  z.strictObject({ status: z.literal("no-reply") }),
  z.strictObject({ status: z.literal("failed") }),
  z.strictObject({ status: z.literal("superseded") }),
]);

export type WebChatResult = z.infer<typeof webChatResultSchema>;
