import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  allTrue,
  BusinessDistrictSubScene,
  CAFE_COFFEES,
  type CafeCoffee,
  type CafeCoffeeName,
  type ChoiceOption,
  HomeSubScene,
  MajorScene,
  planManager,
  SchoolSubScene,
} from "@yuiju/utils";
import { chooseCafeCoffeeAgent } from "@/llm/agent";
import { logger } from "@/utils/logger";

const CAFE_MIN_PRICE = Math.min(...CAFE_COFFEES.map((p) => p.price));

function isAtCafe(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.BusinessDistrict &&
    context.characterStateData.location.minor === BusinessDistrictSubScene.Cafe
  );
}

function formatCoffeeDescription(coffee: CafeCoffee) {
  const description: string[] = [];
  if (coffee.stamina) {
    description.push(`[体力+${coffee.stamina}]`);
  }
  if (coffee.satiety) {
    description.push(`[饱腹+${coffee.satiety}]`);
  }
  if (coffee.mood) {
    description.push(`[心情基础恢复+${coffee.mood}]`);
  }

  return `${coffee.description}${description.join("")}`;
}

function isCafeWorkTimeWithAtLeastOneHourLeft(time: { hour: () => number; minute: () => number }) {
  const minutesSinceMidnight = time.hour() * 60 + time.minute();
  return minutesSinceMidnight >= 10 * 60 && minutesSinceMidnight <= 16 * 60;
}

export const cafeAction: ActionMetadata[] = [
  {
    action: ActionId.Drink_Coffee,
    description: "在薄暮咖啡点咖啡并店内饮用。[金币-?][体力+?][饱腹+?][心情基础恢复+?][耗时30分钟]",
    proactiveShare: {
      enabled: false,
    },
    precondition(context) {
      return allTrue([
        () => isAtCafe(context),
        () => context.characterStateData.money >= CAFE_MIN_PRICE,
      ]);
    },
    async executor(context, selectedAction) {
      await context.characterState.setAction(ActionId.Drink_Coffee);

      const coffeeList: ChoiceOption[] = CAFE_COFFEES.map((coffee) => {
        return {
          value: coffee.name,
          description: formatCoffeeDescription(coffee),
          extra: { price: coffee.price },
        };
      });

      const selectedCoffee = await chooseCafeCoffeeAgent(
        coffeeList,
        context,
        selectedAction.reason,
        [],
        await planManager.getState(),
      );
      if (!selectedCoffee) {
        logger.error("[Drink_Coffee] 没有选择咖啡");
        return { executionResult: "点单失败，没有选择咖啡。" };
      }

      const coffee = CAFE_COFFEES.find((p) => p.name === selectedCoffee.value);
      if (!coffee) {
        logger.error(`[Drink_Coffee] 未找到咖啡: ${selectedCoffee.value}`);
        return { executionResult: "点单失败，未找到咖啡。" };
      }

      const cost = coffee.price;
      if (context.characterStateData.money < cost) {
        logger.info(
          `[Drink_Coffee] 余额不足，跳过点单: ${coffee.name}（单价${coffee.price}元，余额${context.characterStateData.money}元）`,
        );
        return { executionResult: "点单失败，余额不足。" };
      }

      await context.characterState.changeMoney(-cost);

      logger.info(`[Drink_Coffee] 点单成功: ${coffee.name}，花费${cost}元`);

      return {
        executionResult: `在薄暮咖啡点了${coffee.name}，花费${cost}元`,
        startContext: {
          coffeeName: coffee.name,
          stamina: coffee.stamina ?? 0,
          satiety: coffee.satiety ?? 0,
          mood: coffee.mood ?? 0,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const coffeeContext = runningAction.startContext as {
        coffeeName: CafeCoffeeName;
        stamina: number;
        satiety: number;
        mood: number;
      };

      const result: string[] = [];
      if (coffeeContext.stamina !== 0) {
        await context.characterState.changeStamina(coffeeContext.stamina);
        result.push(`[体力+${coffeeContext.stamina}]`);
      }
      if (coffeeContext.satiety !== 0) {
        await context.characterState.changeSatiety(coffeeContext.satiety);
        result.push(`[饱腹+${coffeeContext.satiety}]`);
      }
      let actualMoodGain = 0;
      if (coffeeContext.mood !== 0) {
        actualMoodGain = await context.characterState.recoverMood(coffeeContext.mood);
        result.push(`[心情+${actualMoodGain}]`);
      }

      return {
        completionContext: {
          ...coffeeContext,
          actualMoodGain,
        },
        eventDescription: `在薄暮咖啡喝完了${coffeeContext.coffeeName}${result.join(",")}`,
      };
    },
    durationMin: 30,
  },
  {
    action: ActionId.Work_At_Cafe,
    description: "在薄暮咖啡打工。[金币+200][体力-10][心情-5][饱腹-10][耗时60分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtCafe(context),
        () => isCafeWorkTimeWithAtLeastOneHourLeft(context.worldState.time),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Work_At_Cafe);
    },
    async completionEvent(context) {
      await context.characterState.changeMoney(200);
      await context.characterState.changeStamina(-10);
      await context.characterState.changeSatiety(-10);
      await context.characterState.changeMood(-5);
      return {
        completionContext: {
          earnedMoney: 200,
          staminaDelta: -10,
          satietyDelta: -10,
          moodDelta: -5,
        },
        eventDescription: "在薄暮咖啡打工1小时，赚了200元",
      };
    },
    durationMin: 60,
  },
  {
    action: ActionId.Go_Home_From_Cafe,
    description: "从薄暮咖啡回家。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtCafe(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_Home_From_Cafe);
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
    action: ActionId.Go_To_School_From_Cafe,
    description: "从薄暮咖啡去星见丘高校。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtCafe(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_School_From_Cafe);
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
    action: ActionId.Go_To_Diner_From_Cafe,
    description: "从薄暮咖啡前往日和食堂。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtCafe(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Diner_From_Cafe);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Diner,
      });
      await context.characterState.changeStamina(-1);
      await context.characterState.changeSatiety(-1);
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Train_Station_From_Cafe,
    description: "从薄暮咖啡前往羽浦町站。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtCafe(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Train_Station_From_Cafe);
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
