import {
  buildChatPlanProposalPrompt,
  buildMessageHistoryUserPrompt,
  chatModel,
  chatReplyRulesPrompt,
  createChatPlanChangesProposalTool,
  createToolCallLoggingHooks,
  diarySearchTool,
  generateStructuredOutput,
  getCharacterCardPrompt,
  getPersonMemoryTool,
  listPersonMemoriesTool,
  messageHistorySchemaPrompt,
  NICKNAME,
  queryStateTool,
  queryStaticGuideTool,
  todayEventSearchTool,
} from "@yuiju/utils";
import { Output, stepCountIs } from "ai";
import { z } from "zod";
import { stickerState } from "@/state/sticker";
import { logger } from "@/utils/logger";
import {
  getGroupDisplayName,
  getProtocolMessageId,
  getProtocolMessageSenderName,
  type StoredSatoriGroupMessage,
  type StoredSatoriPrivateMessage,
} from "@/utils/message";
import {
  type AbstractChatSessionManager,
  GroupChatSessionManager,
  PrivateChatSessionManager,
  type SessionHistoryContext,
} from "./chat-session-manager";

type ActiveGroupChatTask = {
  controller: AbortController;
  /**
   * 直接复用触发本次回复生成的群消息 `message_id`，用于识别“当前群里最新的一次回复生成请求”。
   *
   * 说明：
   * - 仅依赖 abort() 不足以完全避免竞态，旧请求可能在被取消前后恰好返回；
   * - 因此在生成完成和真正发送回复前，都要再次校验 requestId 是否仍然是该群最新值；
   * - 只要 requestId 已经过期，就把这次结果视为失效，禁止继续发送消息。
   */
  requestId: string;
};

export type GroupChatResult =
  | {
      status: "completed";
      requestId: string;
      shouldReply: boolean;
      reply: string;
      noReplyReason: string;
    }
  | {
      status: "failed";
    }
  | {
      status: "cancelled";
    };

export type PrivateChatResult =
  | {
      status: "completed";
      shouldReply: boolean;
      reply: string;
      noReplyReason: string;
    }
  | {
      status: "failed";
    };

export class LLMManager {
  private privateSession: AbstractChatSessionManager<StoredSatoriPrivateMessage>;
  private groupSession: AbstractChatSessionManager<StoredSatoriGroupMessage>;
  /**
   * 记录每个群当前正在执行的回复生成任务，用于在同群新消息到来时取消旧请求。
   */
  private activeGroupChatTaskBySessionId = new Map<string, ActiveGroupChatTask>();
  /**
   * 记录每个群当前“最新那条触发回复的消息 id”。
   *
   * 说明：
   * - 这里保存的是最新请求对应的 `message_id`，不是独立生成的序号；
   * - 生成完成后和发送回复前都会再次比对它，避免旧请求在竞态下误发消息。
   */
  private latestGroupChatRequestIdBySessionId = new Map<string, string>();

  constructor() {
    this.privateSession = new PrivateChatSessionManager({
      conversationLimit: 20,
      conversationTtlMs: 8 * 60 * 60 * 1000,
      summaryFlushMessageCount: 15,
      summaryFlushIdleMs: 30 * 60 * 1000,
      episodeIdleMs: 12 * 60 * 60 * 1000,
      episodeMessageCountLimit: 30,
    });
    this.groupSession = new GroupChatSessionManager({
      conversationLimit: 20,
      conversationTtlMs: 8 * 60 * 60 * 1000,
      summaryFlushMessageCount: 15,
      summaryFlushIdleMs: 30 * 60 * 1000,
      episodeIdleMs: 12 * 60 * 60 * 1000,
      episodeMessageCountLimit: 30,
    });
  }

  /**
   * 将群原始消息写入群会话历史，保证群聊模型拿到稳定上下文。
   */
  public recordGroupMessage(message: StoredSatoriGroupMessage, sessionLabel?: string) {
    this.groupSession.recordMessage({
      sessionId: this.buildGroupSessionKey(message),
      sessionLabel: sessionLabel ?? getGroupDisplayName(message),
      message,
    });
  }

  /**
   * 将私聊原始消息写入私聊会话历史，保证回复模型与真实会话事实源保持一致。
   */
  public recordPrivateMessage(message: StoredSatoriPrivateMessage, sessionLabel?: string) {
    this.privateSession.recordMessage({
      sessionId: this.buildPrivateSessionKey(message),
      sessionLabel: sessionLabel ?? getProtocolMessageSenderName(message),
      message,
    });
  }

  /**
   * 读取群聊当前会话上下文，供内部接口复用同一份历史投影。
   */
  public async getGroupConversationContext(input: {
    platform: string;
    channelId: string;
    limit?: number;
  }): Promise<SessionHistoryContext> {
    return this.groupSession.getHistoryJson(
      `group:${input.platform}:${input.channelId}`,
      input.limit,
    );
  }

  private buildPrivateSessionKey(message: StoredSatoriPrivateMessage): string {
    return message.sessionId;
  }

  private buildGroupSessionKey(message: StoredSatoriGroupMessage): string {
    return message.sessionId;
  }

  /**
   * 判断是否需要回复群消息，并在需要时生成自然语言回复。
   */
  public async chatInGroup(message: StoredSatoriGroupMessage): Promise<GroupChatResult> {
    const sessionKey = this.buildGroupSessionKey(message);
    const requestId = getProtocolMessageId(message);
    const previousTask = this.activeGroupChatTaskBySessionId.get(sessionKey);
    if (previousTask) {
      logger.info("[message.llm.group] 新消息到来，取消同群上一条回复生成", {
        groupName: getGroupDisplayName(message),
        sessionId: sessionKey,
        previousRequestId: previousTask.requestId,
        nextRequestId: requestId,
      });
      previousTask.controller.abort("replaced by newer group chat request");
    }

    const controller = new AbortController();
    this.latestGroupChatRequestIdBySessionId.set(sessionKey, requestId);
    this.activeGroupChatTaskBySessionId.set(sessionKey, {
      controller,
      requestId,
    });

    const { historyJson, summary } = await this.groupSession.getHistoryJson(sessionKey);

    const systemPrompt = [
      getCharacterCardPrompt(),
      stickerState.getPromptSection(),
      messageHistorySchemaPrompt,
      chatReplyRulesPrompt,
      buildChatPlanProposalPrompt(),
      "## 当前聊天场景",
      `你现在正在群聊「${getGroupDisplayName(message)}」中以「${NICKNAME}」的身份聊天。`,
    ].join("\n\n");

    try {
      const result = await generateStructuredOutput({
        model: chatModel,
        providerOptions: {
          chat: {
            enable_thinking: true,
          },
        },
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: buildMessageHistoryUserPrompt({
              summary,
              historyJson,
            }),
          },
        ],
        tools: {
          todayEventSearch: todayEventSearchTool,
          diarySearch: diarySearchTool,
          listPersonMemories: listPersonMemoriesTool,
          getPersonMemory: getPersonMemoryTool,
          queryStateTool: queryStateTool,
          queryStaticGuide: queryStaticGuideTool,
          proposePlanChanges: createChatPlanChangesProposalTool({
            scene: "group",
            summary,
            historyJson,
          }),
        },
        stopWhen: stepCountIs(20),
        abortSignal: controller.signal,
        ...createToolCallLoggingHooks({
          scene: "message.llm.group",
        }),
        output: Output.object({
          schema: z.object({
            shouldReply: z.boolean().describe("是否回复"),
            reply: z.string().describe("回复内容，shouldReply为false时，这个字段应该是空字符"),
            noReplyReason: z.string().describe("不回复的简短原因"),
          }),
        }),
      });

      if (!this.isLatestGroupChatRequest(sessionKey, requestId)) {
        return { status: "cancelled" };
      }

      logger.info("[message.llm.group] LLM 返回群聊决策", {
        groupName: getGroupDisplayName(message),
        shouldReply: result.output.shouldReply,
        reply: result.output.reply,
        noReplyReason: result.output.noReplyReason,
      });

      return {
        status: "completed",
        requestId,
        shouldReply: result.output.shouldReply,
        reply: result.output.reply,
        noReplyReason: result.output.noReplyReason,
      };
    } catch (error: any) {
      if (controller.signal.aborted) {
        return { status: "cancelled" };
      }
      logger.error("[message.llm.group] 群聊 LLM 调用失败", {
        groupName: getGroupDisplayName(message),
        sessionId: sessionKey,
        requestId,
        error: error?.message,
      });
      return { status: "failed" };
    } finally {
      const activeTask = this.activeGroupChatTaskBySessionId.get(sessionKey);
      if (activeTask?.requestId === requestId) {
        this.activeGroupChatTaskBySessionId.delete(sessionKey);
      }
    }
  }

  public isLatestGroupChatRequest(sessionId: string, requestId: string): boolean {
    return this.latestGroupChatRequestIdBySessionId.get(sessionId) === requestId;
  }

  public async chatWithLLM(message: StoredSatoriPrivateMessage) {
    const sessionId = this.buildPrivateSessionKey(message);
    const { historyJson, summary } = await this.privateSession.getHistoryJson(sessionId);
    const sessionLabel = getProtocolMessageSenderName(message);
    const systemPrompt = [
      getCharacterCardPrompt(),
      stickerState.getPromptSection(),
      messageHistorySchemaPrompt,
      chatReplyRulesPrompt,
      buildChatPlanProposalPrompt(),
    ].join("\n\n");

    try {
      const result = await generateStructuredOutput({
        model: chatModel,
        providerOptions: {
          chat: {
            enable_thinking: true,
          },
        },
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: buildMessageHistoryUserPrompt({
              summary,
              historyJson,
            }),
          },
        ],
        tools: {
          todayEventSearch: todayEventSearchTool,
          diarySearch: diarySearchTool,
          listPersonMemories: listPersonMemoriesTool,
          getPersonMemory: getPersonMemoryTool,
          queryStateTool: queryStateTool,
          queryStaticGuide: queryStaticGuideTool,
          proposePlanChanges: createChatPlanChangesProposalTool({
            scene: "private",
            summary,
            historyJson,
          }),
        },
        stopWhen: stepCountIs(20),
        ...createToolCallLoggingHooks({
          scene: "message.llm.private",
        }),
        output: Output.object({
          schema: z.object({
            shouldReply: z.boolean().describe("是否回复"),
            reply: z.string().describe("回复内容，shouldReply为false时，这个字段应该是空字符"),
            noReplyReason: z.string().describe("不回复的简短原因"),
          }),
        }),
      });

      logger.info("[message.llm.private] LLM 返回私聊决策", {
        sessionLabel,
        shouldReply: result.output.shouldReply,
        reply: result.output.reply,
        noReplyReason: result.output.noReplyReason,
      });

      return {
        status: "completed",
        shouldReply: result.output.shouldReply,
        reply: result.output.reply,
        noReplyReason: result.output.noReplyReason,
      };
    } catch (error: any) {
      logger.error("[message.llm.private] 私聊 LLM 调用失败", {
        sessionId,
        sessionLabel,
        error: error?.message,
      });
      return { status: "failed" };
    }
  }
}

// 导出默认实例
export const llmManager = new LLMManager();
