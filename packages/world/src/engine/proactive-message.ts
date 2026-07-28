/**
 * 动作完成后的主动群聊分享模块。
 *
 * 负责在行为明确产生分享意图时，读取群聊上下文和贴纸提示词，
 * 交给 LLM 判断当前是否适合主动发送生活分享，并在决策通过后发送到配置的目标群。
 */

import { getYuijuConfig } from "@yuiju/utils/config/config";
import { generateStructuredOutput } from "@yuiju/utils/llm/generate-structured-output";
import { chatModel } from "@yuiju/utils/llm/models";
import { createToolCallLoggingHooks } from "@yuiju/utils/llm/tool-call-logger";
import { diarySearchTool, todayEventSearchTool } from "@yuiju/utils/llm/tools/memory-search";
import { getCharacterCardPrompt } from "@yuiju/utils/prompt/character-card";
import { messageHistorySchemaPrompt } from "@yuiju/utils/prompt/message";
import { buildProactiveGroupMessagePrompt } from "@yuiju/utils/prompt/proactive-message";
import type { ActionMetadata } from "@yuiju/utils/types/action";
import type {
  CharacterStateData,
  RunningActionState,
  WorldStateData,
} from "@yuiju/utils/types/state";
import { Output, stepCountIs } from "ai";
import { z } from "zod";
import { type InternalMessagePlatform, internalMessageApi } from "@/api/internal-message-api";
import { logger } from "@/utils/logger";

interface ScheduleActionCompletionProactiveShareInput {
  actionMetadata: ActionMetadata;
  runningAction: RunningActionState;
  actionSummaryText: string;
  characterStateSnapshot: CharacterStateData;
  worldStateSnapshot: WorldStateData;
}

interface ProactiveGroupMessageDecision {
  shouldSend: boolean;
  reason: string;
  message: string;
}

interface ProactiveGroupTarget {
  platform: InternalMessagePlatform;
  groupId: string;
}

export function scheduleActionCompletionProactiveShare(
  input: ScheduleActionCompletionProactiveShareInput,
) {
  const shareIntent = input.runningAction.proactiveShareIntent;
  if (!shareIntent?.shouldShare || !input.actionMetadata.proactiveShare?.enabled) {
    logger.info("[proactive-message] 分享被取消", shareIntent);
    return;
  }

  shareActionCompletionToGroup({
    ...input,
    shareReason: shareIntent.reason,
  }).catch((error) => {
    logger.error("[proactive-message] 主动分享失败", {
      action: input.runningAction.action,
      behaviorEpisodeId: input.runningAction.behaviorEpisodeId,
      error,
    });
  });
}

async function shareActionCompletionToGroup(
  input: ScheduleActionCompletionProactiveShareInput & {
    shareReason: string;
  },
) {
  const config = getYuijuConfig();
  const stickers = await internalMessageApi.getStickers();
  const targets: ProactiveGroupTarget[] = [
    {
      platform: "onebot",
      groupId: String(config.message.proactive.onebotGroupTargetId),
    },
    {
      platform: "lark",
      groupId: config.message.proactive.larkGroupTargetId,
    },
  ].filter((item) => item.groupId) as ProactiveGroupTarget[];

  for (const target of targets) {
    const groupContext = await internalMessageApi.getGroupContext(
      target.platform,
      target.groupId,
      10,
    );
    const result = await generateStructuredOutput({
      model: chatModel,
      providerOptions: {
        chat: {
          enable_thinking: true,
        },
      },
      instructions: [
        getCharacterCardPrompt(),
        messageHistorySchemaPrompt,
        stickers.promptSection,
      ].join("\n\n"),
      messages: [
        {
          role: "user",
          content: buildProactiveGroupMessagePrompt({
            action: input.runningAction.action,
            shareReason: input.shareReason,
            actionSummaryText: input.actionSummaryText,
            characterStateSnapshot: input.characterStateSnapshot,
            worldStateSnapshot: input.worldStateSnapshot,
            groupContext,
          }),
        },
      ],
      tools: {
        todayEventSearch: todayEventSearchTool,
        diarySearch: diarySearchTool,
      },
      stopWhen: stepCountIs(20),
      ...createToolCallLoggingHooks({
        scene: "world.llm.proactive-message",
      }),
      output: Output.object({
        schema: z.object({
          shouldSend: z.boolean().describe("当前是否适合发送这条主动生活分享"),
          reason: z.string().describe("简短原因"),
          message: z
            .string()
            .describe("最终要发送到群里的自然短消息，shouldSend=false 时为空字符串"),
        }),
      }),
    });

    const decision = result.output as ProactiveGroupMessageDecision;
    logger.info("[proactive-message] 主动分享决策完成", {
      action: input.runningAction.action,
      behaviorEpisodeId: input.runningAction.behaviorEpisodeId,
      platform: target.platform,
      groupId: target.groupId,
      shouldSend: decision.shouldSend,
      reason: decision.reason,
    });

    if (!decision.shouldSend) {
      continue;
    }

    await internalMessageApi.sendGroupMessage(target.platform, target.groupId, decision.message);
  }
}
