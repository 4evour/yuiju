import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  allTrue,
  BusinessDistrictSubScene,
  HomeSubScene,
  type InventoryItemMetadata,
  isDev,
  MajorScene,
  ParkAreaSubScene,
  planManager,
  SchoolSubScene,
} from "@yuiju/utils";
import { planHomeCookingAgent } from "@/llm/agent";
import { generateDiaryForDate, resolveDiaryDateForSleep } from "@/memory/diary";
import { logger } from "@/utils/logger";
import {
  type CookingIngredientSnapshot,
  getAvailableCookingIngredientOptions,
} from "../../utils/cooking-utils";
import { resolveFoodRecoveryPerUnit } from "../../utils/food-utils";
import { isAfternoon, isEvening, isMorning, isNight, isWeekday, isWeekend } from "../utils";

interface HomeCookingStartContext {
  ingredients: CookingIngredientSnapshot[];
  cookedMealName: string;
  cookedMealDescription: string;
}

function isAtHomeHouse(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.Home &&
    context.characterStateData.location.minor === HomeSubScene.House
  );
}

export const homeAction: ActionMetadata[] = [
  {
    action: ActionId.Wake_Up,
    description: "起床并洗漱，新的一天开始。[体力=85][饱腹=20][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    // 已在 precheckAction 中处理
    precondition() {
      return false;
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Wake_Up);
      await context.characterState.setStamina(85);
      await context.characterState.setSatiety(20);
      await context.characterState.clearDailyActions();
    },
    durationMin: 10,
  },
  {
    action: ActionId.Sleep_For_A_Little,
    description: "再睡一会。[心情+1][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition() {
      // 已在 precheckAction 中处理
      return false;
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Sleep_For_A_Little);
    },
    async completionEvent(context) {
      await context.characterState.changeMood(1);
      return { eventDescription: "闹钟响了，稍微多睡了一会儿" };
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_School_From_Home,
    description: "前往星见丘高校。[体力-7][饱腹-5][耗时20分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([() => isAtHomeHouse(context), isWeekday(context), isMorning(context)]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_School_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.School,
        minor: SchoolSubScene.Campus,
      });
      await context.characterState.changeStamina(-7);
      await context.characterState.changeSatiety(-5);
    },
    durationMin: 20,
  },
  {
    action: ActionId.Go_To_Shop_From_Home,
    description: "从家前往小町商店。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Shop_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Shop,
      });
      await context.characterState.changeStamina(-5);
      await context.characterState.changeSatiety(-3);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Cafe_From_Home,
    description: "从家去薄暮咖啡。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Cafe_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Cafe,
      });
      await context.characterState.changeStamina(-5);
      await context.characterState.changeSatiety(-3);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Supermarket_From_Home,
    description: "从家前往超市。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Supermarket_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Supermarket,
      });
      await context.characterState.changeStamina(-5);
      await context.characterState.changeSatiety(-3);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Diner_From_Home,
    description: "从家前往日和食堂。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Diner_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Diner,
      });
      await context.characterState.changeStamina(-5);
      await context.characterState.changeSatiety(-3);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Park_From_Home,
    description: "从家前往南风公园。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        context.characterStateData.stamina >= 3,
        !isNight(context),
      ]);
    },

    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Park_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.ParkArea,
        minor: ParkAreaSubScene.Park,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Shrine_From_Home,
    description: "从家前往结灯神社。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        context.characterStateData.stamina >= 3,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Shrine_From_Home);
      await context.characterState.setLocation({
        major: MajorScene.ParkArea,
        minor: ParkAreaSubScene.Shrine,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Cook_And_Eat_At_Home,
    description:
      "在家做饭吃，从背包中选择一到两种不同食材。[体力+?][饱腹+?][心情+?][耗时30分钟]（可调用 queryAvailableInventoryItems 查询可用食材）",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtHomeHouse(context),
        () => getAvailableCookingIngredientOptions(context).length > 0,
      ]);
    },
    async executor(context, selectedAction) {
      await context.characterState.setAction(ActionId.Cook_And_Eat_At_Home);

      const ingredientOptions = getAvailableCookingIngredientOptions(context);
      if (ingredientOptions.length === 0) {
        return { executionResult: "没有可以用来做饭的食材。" };
      }

      const cookingPlan = await planHomeCookingAgent(
        ingredientOptions,
        context,
        selectedAction.reason,
        [],
        await planManager.getState(),
      );

      if (!cookingPlan?.ingredients.length) {
        return { executionResult: "没有生成做饭方案。" };
      }

      const ingredients: CookingIngredientSnapshot[] = [];

      for (const selectedIngredientName of cookingPlan.ingredients) {
        const ingredientOption = ingredientOptions.find(
          (option) => option.value === selectedIngredientName,
        );
        if (!ingredientOption) {
          continue;
        }

        const consumed = await context.characterState.consumeItem(selectedIngredientName, 1);
        if (!consumed) {
          logger.error(`[Cook_And_Eat_At_Home] 消费食材失败: ${selectedIngredientName} x1`);
          continue;
        }

        ingredients.push({
          name: selectedIngredientName,
          quantity: 1,
          metadata:
            ingredientOption.extra?.metadata &&
            typeof ingredientOption.extra.metadata === "object" &&
            !Array.isArray(ingredientOption.extra.metadata)
              ? (ingredientOption.extra.metadata as InventoryItemMetadata)
              : undefined,
        });
      }

      if (ingredients.length === 0) {
        return { executionResult: "做饭失败，没有成功准备食材。" };
      }

      return {
        executionResult: `开始用${ingredients.map((ingredient) => ingredient.name).join("、")}做${cookingPlan.cookedMealName}`,
        startContext: {
          ingredients,
          cookedMealName: cookingPlan.cookedMealName,
          cookedMealDescription: cookingPlan.cookedMealDescription,
        },
      };
    },
    durationMin: 30,
    async completionEvent(context, runningAction) {
      const cookingContext = runningAction.startContext as unknown as HomeCookingStartContext;

      const ingredientNames = cookingContext.ingredients.map((ingredient) => ingredient.name);

      let stamina = 0;
      let satiety = 0;
      let mood = 0;

      for (const ingredient of cookingContext.ingredients) {
        const recovery = resolveFoodRecoveryPerUnit(ingredient.metadata);
        stamina += recovery.stamina * ingredient.quantity;
        satiety += recovery.satiety * ingredient.quantity;
        mood += recovery.mood * ingredient.quantity;
      }

      stamina = Math.max(1, Math.round(stamina * 1.1));
      satiety = Math.max(1, Math.round(satiety * 1.2));
      mood += cookingContext.ingredients.length === 2 ? 2 : 1;

      await context.characterState.changeStamina(stamina);
      await context.characterState.changeSatiety(satiety);
      await context.characterState.changeMood(mood);

      return {
        completionContext: {
          cookedMeal: {
            name: cookingContext.cookedMealName,
            description: cookingContext.cookedMealDescription,
            stamina,
            satiety,
            mood,
          },
          ingredients: cookingContext.ingredients,
        },
        eventDescription: `用${ingredientNames.join("、")}做出${cookingContext.cookedMealName}吃掉了，${cookingContext.cookedMealDescription}，体力、饱腹和心情恢复了`,
      };
    },
  },
  {
    action: ActionId.Stay_At_Home,
    description: "待在家中，放松、学习。[体力+20][饱腹-10][心情+5][耗时60分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      if (!isAtHomeHouse(context)) {
        return false;
      }

      if (isWeekend(context)) {
        return true;
      } else {
        return allTrue([isAfternoon(context), isEvening(context)]);
      }
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Stay_At_Home);
      await context.characterState.changeStamina(20);
      await context.characterState.changeSatiety(-10);
      await context.characterState.changeMood(5);
    },
    durationMin: 60,
  },
  {
    action: ActionId.Charge_Phone,
    description: "给手机充电。[手机电量=100%][每10%电量耗时3分钟]",
    precondition(context) {
      return isAtHomeHouse(context) && context.characterStateData.phoneBattery < 100;
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Charge_Phone);
    },
    async durationMin(context) {
      return ((100 - context.characterStateData.phoneBattery) / 10) * 3;
    },
    async completionEvent(context) {
      await context.characterState.setPhoneBattery(100);
      return { eventDescription: "手机充好电了，电量恢复到 100%" };
    },
  },
  {
    action: ActionId.Sleep,
    description: "睡觉。[耗时动态]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([() => isAtHomeHouse(context), isNight(context)]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Sleep);
      await context.characterState.clearDailyActions();

      // 进入正式睡眠后，后台异步生成“当天日记”，不阻塞行为主链路。
      generateDiaryForDate({
        diaryDate: resolveDiaryDateForSleep(context.worldState.time.toDate()),
        isDev: isDev(),
      }).catch((error) => {
        logger.error("[homeAction.Sleep] generate diary failed", error);
      });
    },
    durationMin: async (context) => {
      const now = context.worldState.time.clone();
      let target = now.hour(7).minute(30).second(0).millisecond(0);

      if (target.isBefore(now)) {
        target = target.add(1, "day");
      }

      return target.diff(now, "minute");
    },
    async completionEvent(context) {
      await context.characterState.setStamina(85);
      await context.characterState.setSatiety(20);
      await context.characterState.changeMood(2);
      return { eventDescription: "闹钟响了，睡醒了" };
    },
  },
];
