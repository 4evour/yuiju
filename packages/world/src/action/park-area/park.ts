import { PARK_FRUIT_ITEMS } from "@yuiju/utils/constants/world/resource";
import { logger } from "@yuiju/utils/logger";
import {
  type ActionAgentDecision,
  type ActionContext,
  ActionId,
  type ActionMetadata,
} from "@yuiju/utils/types/action";
import {
  HomeSubScene,
  MajorScene,
  ParkAreaSubScene,
  WorldSubScene,
} from "@yuiju/utils/types/state";
import { allTrue } from "@yuiju/utils/utils";
import { worldStateRunner } from "@/engine/world/runner";
import {
  buildActionRandomEventDescription,
  buildMoodChangeDescription,
  generateActionRandomEvent,
} from "@/llm/agent/random-event";
import { isNight } from "../utils";

type ParkWalkTier = {
  durationMin: number;
  moodGain: number;
};

/**
 * 南风公园散步的预设档位。
 *
 * 说明：
 * - 这里使用固定档位而不是任意分钟数，避免 LLM 给出过于离散的时长；
 * - 后续如果希望扩展成晨跑、赏花等行为，可以继续复用该档位映射逻辑。
 */
const PARK_WALK_TIERS: ParkWalkTier[] = [
  { durationMin: 10, moodGain: 2 },
  { durationMin: 30, moodGain: 5 },
  { durationMin: 60, moodGain: 9 },
  { durationMin: 120, moodGain: 15 },
];

const DEFAULT_PARK_WALK_TIER = PARK_WALK_TIERS[1];

const CREPE_STAND_STOCKING_COST = 80;
const CREPE_STAND_MAX_SERVINGS = 10;
const CREPE_MENU = [
  { name: "黄油砂糖可丽饼", price: 12 },
  { name: "香蕉巧克力可丽饼", price: 18 },
  { name: "草莓奶油可丽饼", price: 22 },
  { name: "综合水果可丽饼", price: 26 },
];

function isAtPark(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.ParkArea &&
    context.characterStateData.location.minor === ParkAreaSubScene.Park
  );
}

/**
 * 将 LLM 给出的任意时长收敛到南风公园支持的预设档位。
 *
 * 规则：
 * - 若未给出时长，则默认选择 30 分钟档；
 * - 若给出非档位值，则选择“不小于该时长的最小档位”；
 * - 若超过最大值，则钳制到 120 分钟档。
 */
function resolveParkWalkTier(llmDurationMin?: number): ParkWalkTier {
  if (!llmDurationMin || llmDurationMin <= 0) {
    return DEFAULT_PARK_WALK_TIER;
  }

  return (
    PARK_WALK_TIERS.find((tier) => llmDurationMin <= tier.durationMin) ??
    PARK_WALK_TIERS[PARK_WALK_TIERS.length - 1]
  );
}

export const parkAction: ActionMetadata[] = [
  {
    action: ActionId.Walk_In_Park,
    description:
      "在南风公园散步放松，可以按 10/30/60/120 分钟四档安排时长，时间越久基础心情恢复越多。散步时可以捡到公园的水果。[耗时需要给出]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtPark(context);
    },
    async executor(context, selectedAction) {
      const selectedTier = resolveParkWalkTier(selectedAction.durationMinute);
      await context.characterState.setAction(ActionId.Walk_In_Park);

      return {
        executionResult: `开始在南风公园散步，预计${selectedTier.durationMin}分钟`,
        startContext: {
          durationMin: selectedTier.durationMin,
          moodGain: selectedTier.moodGain,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const walkContext = runningAction.startContext as {
        durationMin: number;
        moodGain: number;
      };
      const randomEvent = await generateActionRandomEvent({
        context,
        setting: `在南风公园散步${walkContext.durationMin}分钟期间发生的日常小事件，可以涉及路人、宠物、公园设施或天气带来的小插曲`,
        triggerProbability: 0.2,
        positiveProbability: 0.4,
      });
      const worldStateData = await context.worldState.getData();
      const parkResources = worldStateData.scenes[WorldSubScene.Park].resources ?? [];
      const collectedResources = parkResources.filter((resource) => resource.amount > 0);
      const consumeCommands = collectedResources.map((resource) => ({
        type: "consume_scene_resource" as const,
        scene: WorldSubScene.Park,
        resource: resource.name,
        amount: resource.amount,
      }));

      if (consumeCommands.length > 0) {
        await worldStateRunner.consumeCommandsAndRunTick(consumeCommands, new Date());
      }

      for (const resource of collectedResources) {
        const item = PARK_FRUIT_ITEMS.find((candidate) => candidate.name === resource.name);
        if (!item) {
          logger.error(`Park walk resource item not found: ${resource.name}`);
          continue;
        }

        await context.characterState.addItem(
          {
            name: item.name,
            description: item.description,
            categories: item.categories,
            metadata: item.metadata,
          },
          resource.amount,
        );
      }

      const actualMoodGain = await context.characterState.recoverMood(walkContext.moodGain);
      const randomEventResult = randomEvent
        ? {
            ...randomEvent,
            actualMoodChange: await context.characterState.changeMood(randomEvent.moodChange),
          }
        : undefined;
      const collectedItemText =
        collectedResources.length > 0
          ? `，捡到了${collectedResources
              .map((resource) => `${resource.name}${resource.amount}个`)
              .join("、")}`
          : "，但这次没有捡到任何东西";

      const randomEventCompletion = buildActionRandomEventDescription({
        actionSummaryText: `悠酱在南风公园散步了${walkContext.durationMin}分钟，散步本身让${buildMoodChangeDescription(actualMoodGain)}${collectedItemText}`,
        actionMoodChange: actualMoodGain,
        randomEvent: randomEventResult,
      });
      context.runtimeState.actionSummaryText = randomEventCompletion.actionSummaryText;

      return {
        completionContext: {
          durationMin: walkContext.durationMin,
          actionMoodChange: {
            base: walkContext.moodGain,
            actual: actualMoodGain,
          },
          collectedItems: collectedResources.map((resource) => ({
            name: resource.name,
            quantity: resource.amount,
          })),
          randomEvent: randomEventResult,
          totalMoodChange: randomEventCompletion.totalMoodChange,
        },
        eventDescription: randomEventCompletion.eventDescription,
      };
    },
    async durationMin(_context, selectedAction?: ActionAgentDecision) {
      return resolveParkWalkTier(selectedAction?.durationMinute).durationMin;
    },
  },
  {
    action: ActionId.Run_Crepe_Stand_In_Park,
    description:
      "在南风公园摆可丽饼摊，花80金币采购本次摆摊使用的原料，客流和营业额会在收摊时随机结算，没用完的原料不会保留。[金币-80][金币+?][体力-10][饱腹-10][耗时60分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtPark(context),
        () => !isNight(context),
        () => context.characterStateData.money >= CREPE_STAND_STOCKING_COST,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Run_Crepe_Stand_In_Park);
      await context.characterState.changeMoney(-CREPE_STAND_STOCKING_COST);

      return {
        executionResult: `花了${CREPE_STAND_STOCKING_COST}金币采购原料，在南风公园支起可丽饼摊`,
        startContext: {
          stockingCost: CREPE_STAND_STOCKING_COST,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const standContext = runningAction.startContext as {
        stockingCost: number;
      };
      const randomEvent = await generateActionRandomEvent({
        context,
        setting:
          "在南风公园摆可丽饼摊一小时期间发生的日常小事件，可以涉及顾客、点单、制作过程、摊位设备或天气带来的小插曲",
        triggerProbability: 0.3,
        positiveProbability: 0.3,
      });
      const visitorCount = Math.floor(Math.random() * (CREPE_STAND_MAX_SERVINGS + 1));
      const customerPurchases = Array.from({ length: visitorCount }, () => {
        const crepe = CREPE_MENU[Math.floor(Math.random() * CREPE_MENU.length)];
        return {
          itemName: crepe.name,
          amount: crepe.price,
        };
      });
      const totalIncome = customerPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
      const profit = totalIncome - standContext.stockingCost;
      const soldItems = CREPE_MENU.flatMap((crepe) => {
        const quantity = customerPurchases.filter(
          (purchase) => purchase.itemName === crepe.name,
        ).length;

        return quantity > 0
          ? [
              {
                name: crepe.name,
                quantity,
                unitPrice: crepe.price,
              },
            ]
          : [];
      });

      await context.characterState.changeMoney(totalIncome);
      await context.characterState.changeStamina(-10);
      await context.characterState.changeSatiety(-10);
      const randomEventResult = randomEvent
        ? {
            ...randomEvent,
            actualMoodChange: await context.characterState.changeMood(randomEvent.moodChange),
          }
        : undefined;

      const salesDescription =
        soldItems.length > 0
          ? soldItems.map((item) => `${item.name}${item.quantity}份`).join("、")
          : "没有卖出可丽饼";
      const profitDescription = profit >= 0 ? `盈利${profit}金币` : `亏损${-profit}金币`;
      const staminaCost = Math.min(context.characterStateData.stamina, 10);
      const satietyCost = Math.min(context.characterStateData.satiety, 10);
      const randomEventCompletion = buildActionRandomEventDescription({
        actionSummaryText: `悠酱在南风公园摆了60分钟可丽饼摊，来了${visitorCount}位客人，${salesDescription}，营业额${totalIncome}金币，扣除进货费后${profitDescription}，体力下降${staminaCost}点，饱腹度下降${satietyCost}点`,
        actionMoodChange: 0,
        randomEvent: randomEventResult,
      });
      context.runtimeState.actionSummaryText = randomEventCompletion.actionSummaryText;

      return {
        completionContext: {
          stockingCost: standContext.stockingCost,
          visitorCount,
          customerPurchases,
          soldItems,
          totalIncome,
          profit,
          staminaChange: -staminaCost,
          satietyChange: -satietyCost,
          randomEvent: randomEventResult,
          totalMoodChange: randomEventCompletion.totalMoodChange,
        },
      };
    },
    durationMin: 60,
  },
  {
    action: ActionId.Go_Home_From_Park,
    description: "从南风公园回家。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtPark(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_Home_From_Park);
      await context.characterState.setLocation({
        major: MajorScene.Home,
        minor: HomeSubScene.House,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Shrine_From_Park,
    description: "从南风公园前往结灯神社。[体力-3][饱腹-2][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([() => isAtPark(context), () => !isNight(context)]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Shrine_From_Park);
      await context.characterState.setLocation({
        major: MajorScene.ParkArea,
        minor: ParkAreaSubScene.Shrine,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Pond_From_Park,
    description: "从南风公园前往水音池。[体力-3][饱腹-2][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtPark(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Pond_From_Park);
      await context.characterState.setLocation({
        major: MajorScene.ParkArea,
        minor: ParkAreaSubScene.Pond,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 5,
  },
];
