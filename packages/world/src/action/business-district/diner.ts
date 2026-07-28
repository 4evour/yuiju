import { DINER_MEALS, type DinerMeal } from "@yuiju/utils/constants/world/diner";
import { planManager } from "@yuiju/utils/memory/plan/manager";
import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  type ChoiceOption,
} from "@yuiju/utils/types/action";
import {
  BusinessDistrictSubScene,
  HomeSubScene,
  MajorScene,
  SchoolSubScene,
} from "@yuiju/utils/types/state";
import { allTrue } from "@yuiju/utils/utils";
import { chooseDinerMealAgent } from "@/llm/agent/business-district";
import { logger } from "@/utils/logger";

const DINER_MIN_PRICE = Math.min(...DINER_MEALS.map((meal) => meal.price));

function isAtDiner(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.BusinessDistrict &&
    context.characterStateData.location.minor === BusinessDistrictSubScene.Diner
  );
}

function formatDinerMealDescription(meal: DinerMeal) {
  const description: string[] = [`[价格${meal.price}金币]`];
  if (meal.stamina) {
    description.push(`[体力+${meal.stamina}]`);
  }
  if (meal.satiety) {
    description.push(`[饱腹+${meal.satiety}]`);
  }
  if (meal.mood) {
    description.push(`[心情基础恢复+${meal.mood}]`);
  }

  return `${meal.description}${description.join("")}`;
}

export const dinerAction: ActionMetadata[] = [
  {
    action: ActionId.Eat_At_Diner,
    description: "在日和食堂店内就餐。[金币-?][体力+?][饱腹+?][心情基础恢复+?][耗时20分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtDiner(context),
        () => context.characterStateData.money >= DINER_MIN_PRICE,
      ]);
    },
    async executor(context, selectedAction) {
      await context.characterState.setAction(ActionId.Eat_At_Diner);

      const mealList: ChoiceOption[] = DINER_MEALS.map((meal) => {
        return {
          value: meal.name,
          description: formatDinerMealDescription(meal),
        };
      });

      const selectedMeal = await chooseDinerMealAgent(
        mealList,
        context,
        selectedAction.reason,
        [],
        await planManager.getState(),
      );
      if (!selectedMeal) {
        logger.error("[Eat_At_Diner] 没有选择餐品");
        return { executionResult: "点餐失败，没有选择餐品。" };
      }

      const meal = DINER_MEALS.find((item) => item.name === selectedMeal.value);
      if (!meal) {
        logger.error(`[Eat_At_Diner] 未找到餐品: ${selectedMeal.value}`);
        return { executionResult: "点餐失败，未找到餐品。" };
      }

      if (context.characterStateData.money < meal.price) {
        logger.info(
          `[Eat_At_Diner] 余额不足，跳过点餐: ${meal.name}（单价${meal.price}元，余额${context.characterStateData.money}元）`,
        );
        return { executionResult: "点餐失败，余额不足。" };
      }

      await context.characterState.changeMoney(-meal.price);

      logger.info(`[Eat_At_Diner] 点餐成功: ${meal.name}，花费${meal.price}元`);

      return {
        executionResult: `在日和食堂点了${meal.name}，花费${meal.price}元`,
        startContext: {
          mealName: meal.name,
          stamina: meal.stamina ?? 0,
          satiety: meal.satiety ?? 0,
          mood: meal.mood ?? 0,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const mealContext = runningAction.startContext as {
        mealName: string;
        stamina: number;
        satiety: number;
        mood: number;
      };

      const result: string[] = [];
      if (mealContext.stamina !== 0) {
        await context.characterState.changeStamina(mealContext.stamina);
        result.push(`[体力+${mealContext.stamina}]`);
      }
      if (mealContext.satiety !== 0) {
        await context.characterState.changeSatiety(mealContext.satiety);
        result.push(`[饱腹+${mealContext.satiety}]`);
      }
      let actualMoodGain = 0;
      if (mealContext.mood !== 0) {
        actualMoodGain = await context.characterState.recoverMood(mealContext.mood);
        result.push(`[心情+${actualMoodGain}]`);
      }

      context.runtimeState.actionSummaryText = `悠酱在日和食堂吃完了${mealContext.mealName}${result.join(",")}`;

      return {
        completionContext: {
          ...mealContext,
          actualMoodGain,
        },
      };
    },
    durationMin: 20,
  },
  {
    action: ActionId.Go_Home_From_Diner,
    description: "从日和食堂回家。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtDiner(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_Home_From_Diner);
      await context.characterState.setLocation({
        major: MajorScene.Home,
        minor: HomeSubScene.House,
      });
      await context.characterState.changeStamina(-5);
      await context.characterState.changeSatiety(-3);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_School_From_Diner,
    description: "从日和食堂前往星见丘高校。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtDiner(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_School_From_Diner);
      await context.characterState.setLocation({
        major: MajorScene.School,
        minor: SchoolSubScene.Campus,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Supermarket_From_Diner,
    description: "从日和食堂前往超市。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtDiner(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Supermarket_From_Diner);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Supermarket,
      });
      await context.characterState.changeStamina(-1);
      await context.characterState.changeSatiety(-1);
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Cafe_From_Diner,
    description: "从日和食堂前往薄暮咖啡。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtDiner(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Cafe_From_Diner);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Cafe,
      });
      await context.characterState.changeStamina(-1);
      await context.characterState.changeSatiety(-1);
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Train_Station_From_Diner,
    description: "从日和食堂前往羽浦町站。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtDiner(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Train_Station_From_Diner);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.TrainStation,
      });
      await context.characterState.changeStamina(-1);
      await context.characterState.changeSatiety(-1);
    },
    durationMin: 5,
  },
];
