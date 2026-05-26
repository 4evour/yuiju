import type { ActionContext, BehaviorRecord, ChoiceOption, PlanState } from "@yuiju/utils";
import {
  chooseCookingIngredientsPrompt,
  chooseFoodPrompt,
  flashModel,
  generateStructuredOutput,
} from "@yuiju/utils";
import { Output } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { type ParameterAgentSelectedItem, RETRY_COUNT } from "./shared";

/**
 *
 * 选择食物
 */
export async function chooseFoodAgent(
  foodList: ChoiceOption[],
  context: ActionContext,
  actionMemoryList: BehaviorRecord[],
  planState: PlanState,
): Promise<ParameterAgentSelectedItem[] | undefined> {
  const systemPrompt = chooseFoodPrompt({
    availableFood: foodList,
    characterState: context.characterStateData,
    worldState: context.worldState,
    longTermPlanTitle: planState.longTermPlan?.title,
    shortTermPlanTitles: planState.shortTermPlans.map((plan) => plan.title),
    recentBehaviorList: actionMemoryList.map((item) => ({
      behavior: item.behavior,
      description: item.description,
      time: dayjs(item.timestamp),
    })),
  });

  for (let i = 0; i < RETRY_COUNT; i++) {
    try {
      const { output } = await generateStructuredOutput({
        model: flashModel,
        providerOptions: {
          flash: {
            enable_thinking: false,
          },
        },
        output: Output.object({
          schema: z.array(
            z.object({
              value: z.enum(foodList.map((item) => item.value)).describe("选择的食物名称"),
              quantity: z.number().describe("选择的数量"),
            }),
          ),
        }),
        prompt: systemPrompt,
      });
      // LLM 返回的是数组，需要包装成 selectedList 格式
      logger.info("[chooseFoodAgent] 选择食物结果", output);
      return output;
    } catch (error) {
      logger.error("[chooseFoodAgent] 选择食物失败", error);
    }
  }
}

/**
 * 选择做饭食材
 */
export async function chooseCookingIngredientsAgent(
  ingredientList: ChoiceOption[],
  context: ActionContext,
  actionMemoryList: BehaviorRecord[],
  planState: PlanState,
): Promise<string[] | undefined> {
  const systemPrompt = chooseCookingIngredientsPrompt({
    availableIngredients: ingredientList,
    characterState: context.characterStateData,
    worldState: context.worldState,
    longTermPlanTitle: planState.longTermPlan?.title,
    shortTermPlanTitles: planState.shortTermPlans.map((plan) => plan.title),
    recentBehaviorList: actionMemoryList.map((item) => ({
      behavior: item.behavior,
      description: item.description,
      time: dayjs(item.timestamp),
    })),
  });

  for (let i = 0; i < RETRY_COUNT; i++) {
    try {
      const { output } = await generateStructuredOutput({
        model: flashModel,
        providerOptions: {
          flash: {
            enable_thinking: false,
          },
        },
        output: Output.object({
          schema: z
            .array(z.enum(ingredientList.map((item) => item.value)).describe("选择的食材名称"))
            .min(1)
            .max(2)
            .refine((items) => new Set(items).size === items.length, {
              message: "选择两种食材时不能重复",
            }),
        }),
        prompt: systemPrompt,
      });
      logger.info("[chooseCookingIngredientsAgent] 选择做饭食材结果", output);
      return output;
    } catch (error) {
      logger.error("[chooseCookingIngredientsAgent] 选择做饭食材失败", error);
    }
  }
}
