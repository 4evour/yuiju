import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  allTrue,
  type ChoiceOption,
  InventoryItemCategory,
  type InventoryItemMetadata,
  planManager,
} from "@yuiju/utils";
import {
  chooseFoodAgent,
  generateHermesUserPromptFromPhoneReason,
  runHermesPhoneAgent,
} from "@/llm/agent";
import { logger } from "@/utils/logger";
import { resolveFoodRecoveryPerUnit } from "../utils/food-utils";

function getAvailableFoodOptions(context: ActionContext): ChoiceOption[] {
  const inventory = context.characterStateData.inventory || [];
  const availableFood = inventory.filter(
    (item) => item?.categories?.includes(InventoryItemCategory.Food) && item.quantity > 0,
  );

  return availableFood.map((food) => {
    return {
      value: food.name,
      description: `${food.description}（剩余${food.quantity}个）`,
      extra: food.metadata as InventoryItemMetadata,
    };
  });
}

export const anywhereAction: ActionMetadata[] = [
  {
    action: ActionId.Idle,
    description: "休息等待，可以在任何地点进行。[耗时需要给出]",
    proactiveShare: {
      enabled: true,
    },
    precondition(_context) {
      return true;
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Idle);
    },
    async durationMin(_context, selectedAction) {
      return selectedAction?.durationMinute ?? 10;
    },
  },
  {
    action: ActionId.Use_Phone,
    description:
      "可以使用手机中的应用程序。选择该 Action 时需要在 reason 中说明准备用手机做什么。[手机电量-30%][动态耗时]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return context.characterStateData.phoneBattery >= 30;
    },
    async executor(context, selectedAction) {
      await context.characterState.setAction(ActionId.Use_Phone);

      const phoneUsePlan = await generateHermesUserPromptFromPhoneReason(selectedAction.reason);
      if (phoneUsePlan.isValidIntent) {
        context.runtimeState.actionSummaryText = [
          `悠酱在「${context.characterStateData.location.major}${context.characterStateData.location.minor ? `-${context.characterStateData.location.minor}` : ""}」开始使用手机里的「${phoneUsePlan.phoneApplication}」`,
          `原因：${selectedAction.reason}`,
        ].join("；");
      } else {
        context.runtimeState.actionSummaryText = [
          `悠酱在「${context.characterStateData.location.major}${context.characterStateData.location.minor ? `-${context.characterStateData.location.minor}` : ""}」想使用手机`,
          `但手机里没有能完成这件事的应用程序`,
          `原因：${selectedAction.reason}`,
        ].join("；");
      }

      await context.characterState.changePhoneBattery(-30);

      return {
        executionResult: phoneUsePlan.isValidIntent
          ? `开始使用手机里的「${phoneUsePlan.phoneApplication}」`
          : "手机里没有能完成这件事的应用程序",
        startContext: {
          isValidIntent: phoneUsePlan.isValidIntent,
          phoneApplication: phoneUsePlan.phoneApplication,
          hermesUserPrompt: phoneUsePlan.hermesUserPrompt,
        },
      };
    },
    durationMin: 10,
    async completionEvent(context, runningAction) {
      const phoneContext = runningAction.startContext as {
        isValidIntent: boolean;
        phoneApplication: string;
        hermesUserPrompt: string;
      };

      let phoneText = "手机里的地图应用好像突然崩溃了，这次没能看到街景。";

      if (phoneContext.isValidIntent) {
        try {
          phoneText = await runHermesPhoneAgent(phoneContext.hermesUserPrompt);
        } catch (error) {
          logger.error("[Use_Phone] 手机应用执行失败", error);
        }
      } else {
        phoneText = "手机里没有能完成这件事的应用程序。";
      }

      const eventDescription = phoneContext.isValidIntent
        ? `使用完手机里的「${phoneContext.phoneApplication}」；${phoneText}`
        : `看了看手机；${phoneText}`;
      context.runtimeState.actionSummaryText = `悠酱${eventDescription}`;

      return {
        completionContext: {
          ...phoneContext,
          phoneText,
        },
        eventDescription,
      };
    },
  },
  {
    action: ActionId.Eat_Item,
    description:
      "吃食物。[体力+?][饱腹+?][心情基础恢复+?][耗时10分钟]（可调用 queryAvailableInventoryItems 查看可用食物）",
    proactiveShare: {
      enabled: true,
    },
    precondition: (context) => {
      return allTrue([
        () => {
          return getAvailableFoodOptions(context).length > 0;
        },
      ]);
    },
    async executor(context, selectedAction) {
      const foodList = getAvailableFoodOptions(context);
      if (foodList.length === 0) {
        return { executionResult: "没有可吃的食物。" };
      }

      // 设置当前动作
      await context.characterState.setAction(ActionId.Eat_Item);

      const selectionResult = await chooseFoodAgent(
        foodList,
        context,
        selectedAction.reason,
        [],
        await planManager.getState(),
      );
      const selectedFoodList = selectionResult
        ?.filter((item) => foodList.find((param) => param.value === item.value))
        ?.map((item) => {
          const baseParam = foodList.find((param) => param.value === item.value)!;

          return {
            ...baseParam,
            quantity: item.quantity,
          };
        });

      if (!selectedFoodList || selectedFoodList.length === 0) {
        return { executionResult: "没有选择要吃的食物。" };
      }

      const eatenFood: Array<{
        name: string;
        quantity: number;
        stamina: number;
        satiety: number;
        mood: number;
      }> = [];

      // 遍历处理所有选择的食物
      for (const selectedFood of selectedFoodList) {
        const quantity = selectedFood.quantity || 1;

        // 消费指定数量的物品
        const consumed = await context.characterState.consumeItem(selectedFood.value, quantity);
        if (!consumed) {
          logger.error(`[Eat_Item] 消费食物失败: ${selectedFood.value} x${quantity}`);
          continue;
        }

        // 统一通过 metadata 解析收益，避免购买时配置的 mood/satiety 在消费时丢失。
        const { stamina, satiety, mood } = resolveFoodRecoveryPerUnit(selectedFood.extra);
        const totalStamina = stamina * quantity;
        const totalSatiety = satiety * quantity;
        const totalMood = mood * quantity;

        logger.info(
          `[Eat_Item] 成功消费 ${selectedFood.value} x${quantity}，等待完成后恢复 ${totalStamina} 点体力，${totalSatiety} 点饱腹，${totalMood} 点心情`,
        );

        eatenFood.push({
          name: selectedFood.value,
          quantity,
          stamina: totalStamina,
          satiety: totalSatiety,
          mood: totalMood,
        });
      }

      if (eatenFood.length === 0) {
        return { executionResult: "尝试吃东西，但都没吃成功。" };
      }

      return {
        executionResult: `开始吃${eatenFood.map((food) => `${food.name}${food.quantity}个`).join("，")}`,
        startContext: {
          eatenFood,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const eatContext = runningAction.startContext as {
        eatenFood: Array<{
          name: string;
          quantity: number;
          stamina: number;
          satiety: number;
          mood: number;
        }>;
      };

      let totalStamina = 0;
      let totalSatiety = 0;
      let totalMood = 0;

      for (const food of eatContext.eatenFood) {
        totalStamina += food.stamina;
        totalSatiety += food.satiety;
        totalMood += food.mood;
      }

      if (totalStamina !== 0) {
        await context.characterState.changeStamina(totalStamina);
      }
      if (totalSatiety !== 0) {
        await context.characterState.changeSatiety(totalSatiety);
      }
      let actualMoodGain = 0;
      if (totalMood !== 0) {
        actualMoodGain = await context.characterState.recoverMood(totalMood);
      }

      return {
        completionContext: {
          ...eatContext,
          baseMoodGain: totalMood,
          actualMoodGain,
        },
        eventDescription: `吃完了${eatContext.eatenFood.map((food) => `${food.name}${food.quantity}个`).join("，")}`,
      };
    },
    durationMin: 10,
  },
];
