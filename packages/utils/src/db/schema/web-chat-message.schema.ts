import mongoose, { type Document, Schema } from "mongoose";
import type { WebChatReply } from "../../types/web-chat";
import { webChatReplySchema } from "../../types/web-chat";
import { getMongoConnection } from "../connect";

export type WebChatResponseStatus = "pending" | "replied" | "no-reply" | "failed" | "superseded";

export interface IWebChatMessage extends Document {
  sessionId: string;
  messageId: string;
  sender: {
    id: string;
    displayName: string;
  };
  text: string;
  sentAt: Date;
  responseStatus: WebChatResponseStatus;
  reply?: WebChatReply;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebChatSenderSchema = new Schema(
  {
    id: { type: String, required: true },
    displayName: { type: String, required: true },
  },
  { _id: false },
);

export const WebChatMessageSchema = new Schema<IWebChatMessage>(
  {
    sessionId: { type: String, required: true },
    messageId: { type: String, required: true },
    sender: { type: WebChatSenderSchema, required: true },
    text: { type: String, required: true },
    sentAt: { type: Date, required: true },
    responseStatus: {
      type: String,
      required: true,
      enum: ["pending", "replied", "no-reply", "failed", "superseded"],
    },
    reply: {
      type: Schema.Types.Mixed,
      validate: {
        validator: (value: unknown) =>
          value === undefined || webChatReplySchema.safeParse(value).success,
        message: "reply must match the Web chat reply contract",
      },
    },
    completedAt: { type: Date },
  },
  {
    collection: "web_chat_message",
    timestamps: true,
  },
);

WebChatMessageSchema.index({ sessionId: 1, messageId: 1 }, { unique: true });
WebChatMessageSchema.index({ sessionId: 1, sentAt: -1, _id: -1 });

export async function getWebChatMessageModel(): Promise<mongoose.Model<IWebChatMessage>> {
  const connection = await getMongoConnection();
  return (
    (connection.models.WebChatMessage as mongoose.Model<IWebChatMessage> | undefined) ??
    connection.model<IWebChatMessage>("WebChatMessage", WebChatMessageSchema)
  );
}
