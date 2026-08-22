import mongoose, { Types } from "mongoose";
import type { WebChatHistoryCursor, WebChatReply, WebChatResult } from "../../types/web-chat";
import { webChatReplySchema } from "../../types/web-chat";
import {
  getWebChatMessageModel,
  type IWebChatMessage,
  type WebChatResponseStatus,
} from "../schema/web-chat-message.schema";

export interface WebChatMessageWriteInput {
  sessionId: string;
  messageId: string;
  sender: {
    id: string;
    displayName: string;
  };
  text: string;
  sentAt: number;
}

export type BeginWebChatMessageResult =
  | { status: "created"; message: IWebChatMessage }
  | { status: "existing"; message: IWebChatMessage };

export async function beginWebChatMessage(
  input: WebChatMessageWriteInput,
): Promise<BeginWebChatMessageResult> {
  const model = await getWebChatMessageModel();

  try {
    const message = await model.create({
      ...input,
      sentAt: new Date(input.sentAt),
      responseStatus: "pending",
    });
    return { status: "created", message };
  } catch (error) {
    if (!(error instanceof mongoose.mongo.MongoServerError) || error.code !== 11000) {
      throw error;
    }
  }

  const existing = await model
    .findOne({ sessionId: input.sessionId, messageId: input.messageId })
    .orFail()
    .exec();
  return { status: "existing", message: existing };
}

export function matchesWebChatMessageInput(
  message: IWebChatMessage,
  input: WebChatMessageWriteInput,
): boolean {
  return (
    message.sender.id === input.sender.id &&
    message.sender.displayName === input.sender.displayName &&
    message.text === input.text &&
    message.sentAt.getTime() === input.sentAt
  );
}

export function projectStoredWebChatResult(message: IWebChatMessage): WebChatResult {
  if (message.responseStatus === "pending") {
    return { status: "pending-conflict" };
  }
  if (message.responseStatus === "replied") {
    return { status: "replied", reply: webChatReplySchema.parse(message.reply) };
  }
  return { status: message.responseStatus };
}

export async function completeWebChatMessage(
  sessionId: string,
  messageId: string,
  result:
    | { status: Exclude<WebChatResponseStatus, "pending" | "replied"> }
    | { status: "replied"; reply: WebChatReply },
): Promise<void> {
  const model = await getWebChatMessageModel();
  const completedAt = new Date();
  const update =
    result.status === "replied"
      ? { responseStatus: result.status, reply: result.reply, completedAt }
      : { responseStatus: result.status, completedAt };
  const writeResult = await model
    .updateOne(
      { sessionId, messageId, responseStatus: "pending" },
      { $set: update },
      { runValidators: true },
    )
    .exec();

  if (writeResult.modifiedCount !== 1) {
    const current = await model.findOne({ sessionId, messageId }).orFail().exec();
    throw new Error(
      `cannot complete Web chat message ${sessionId}/${messageId} from ${current.responseStatus}`,
    );
  }
}

export async function getWebChatMessagesPage(options: {
  sessionId: string;
  limit: number;
  cursor?: WebChatHistoryCursor;
}): Promise<{ messages: IWebChatMessage[]; nextCursor: WebChatHistoryCursor | null }> {
  const model = await getWebChatMessageModel();
  const filter: Record<string, unknown> = { sessionId: options.sessionId };

  if (options.cursor) {
    const cursorDate = new Date(options.cursor.sentAt);
    filter.$or = [
      { sentAt: { $lt: cursorDate } },
      { sentAt: cursorDate, _id: { $lt: new Types.ObjectId(options.cursor.id) } },
    ];
  }

  const documents = await model
    .find(filter)
    .sort({ sentAt: -1, _id: -1 })
    .limit(options.limit + 1)
    .exec();
  const hasMore = documents.length > options.limit;
  const messages = documents.slice(0, options.limit);
  const oldest = messages.at(-1);
  const chronologicalMessages: IWebChatMessage[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message) {
      chronologicalMessages.push(message);
    }
  }

  return {
    messages: chronologicalMessages,
    nextCursor: hasMore && oldest ? { sentAt: oldest.sentAt.getTime(), id: oldest.id } : null,
  };
}
