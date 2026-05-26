import type {
  ActionAgentDecision,
  ActionContext,
  ActionMetadata,
  BehaviorRecord,
  PlanState,
} from "@yuiju/utils";
import {
  agentPlanChangeSchema,
  chooseActionPrompt,
  createToolCallLoggingHooks,
  diarySearchTool,
  generateStructuredOutput,
  getPersonMemoryTool,
  listPersonMemoriesTool,
  queryStaticGuideTool,
  reviewPlanChangesTool,
  strongModel,
  todayEventSearchTool,
} from "@yuiju/utils";
import { Output, stepCountIs } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { queryAvailableFood } from "../tools";
import { RETRY_COUNT } from "./shared";

/**
 *
 * 选择 Action
 */
export async function chooseActionAgent(
  actionList: ActionMetadata[],
  context: ActionContext,
  actionMemoryList: BehaviorRecord[],
  planState: PlanState,
): Promise<ActionAgentDecision | undefined> {
  const systemPrompt = chooseActionPrompt({
    actionList,
    characterState: context.characterStateData,
    worldState: context.worldState,
    eventDescription: context.eventDescription,
    recentBehaviorList: actionMemoryList.map((item) => ({
      behavior: item.behavior,
      description: item.description,
      time: dayjs(item.timestamp),
    })),
    longTermPlanTitle: planState.longTermPlan?.title,
    shortTermPlanTitles: planState.shortTermPlans.map((plan) => plan.title),
  });

  for (let i = 0; i < RETRY_COUNT; i++) {
    try {
      const { output } = await generateStructuredOutput({
        model: strongModel,
        providerOptions: {
          strong: {
            enable_thinking: true,
          },
        },
        tools: {
          todayEventSearch: todayEventSearchTool,
          diarySearch: diarySearchTool,
          listPersonMemories: listPersonMemoriesTool,
          getPersonMemory: getPersonMemoryTool,
          queryAvailableFood: queryAvailableFood(context),
          queryStaticGuide: queryStaticGuideTool,
          reviewPlanChanges: reviewPlanChangesTool(),
        },
        output: Output.object({
          schema: z.object({
            action: z
              .enum(actionList?.map((item) => item.action))
              .describe("Action ID，例如：发呆、起床等"),
            reason: z.string().describe("选择这个 Action 的简短原因"),
            durationMinute: z
              .number()
              .optional()
              .describe("Action持续多少分钟，只有特殊的Action需要给出持续时间"),
            planChanges: z
              .array(agentPlanChangeSchema)
              .min(1)
              .optional()
              .describe("只有确实需要调整计划时才输出。输出前必须先调用 reviewPlanChanges。"),
            proactiveShareIntent: z
              .object({
                shouldShare: z.boolean().describe("是否想向别人分享点什么"),
                reason: z.string().describe("想分享或不想分享的简短理由"),
              })
              .optional()
              .describe("当你想向别人分享点什么的时候才输出"),
          }),
        }),
        prompt: systemPrompt,
        stopWhen: stepCountIs(20),
        ...createToolCallLoggingHooks({
          scene: "world.llm.choose-action",
        }),
      });

      logger.info("[chooseActionAgent] 选择行动结果", output);
      return output;
    } catch (error) {
      logger.error("[chooseActionAgent] 选择行动失败", error);
    }
  }
}
