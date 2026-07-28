import { COAST_VALUABLE_ITEMS } from "@yuiju/utils/constants/world/resource";
import { logger } from "@yuiju/utils/logger";
import {
  type ActionAgentDecision,
  type ActionContext,
  ActionId,
  type ActionMetadata,
} from "@yuiju/utils/types/action";
import {
  BusinessDistrictSubScene,
  CoastAreaSubScene,
  MajorScene,
  WorldSubScene,
} from "@yuiju/utils/types/state";
import { allTrue } from "@yuiju/utils/utils";
import { worldStateRunner } from "@/engine/world/runner";
import {
  buildActionRandomEventDescription,
  buildMoodChangeDescription,
  generateActionRandomEvent,
} from "@/llm/agent/random-event";
import { notDoneToday } from "../utils";

type CoastWalkTier = {
  durationMin: number;
  moodGain: number;
};

/**
 * 月汐海岸散步的固定时长档位。
 *
 * 设计说明：
 * - 复用与南风公园相同的收益模型，保持“方案 A”的一致体验；
 * - 使用离散档位而不是任意分钟数，避免 LLM 输出过碎的时长选择；
 * - 如果后续要增加“看海发呆 / 捡贝壳 / 吹海风”等行为，可以继续沿用这套档位解析逻辑。
 */
const COAST_WALK_TIERS: CoastWalkTier[] = [
  { durationMin: 10, moodGain: 2 },
  { durationMin: 30, moodGain: 5 },
  { durationMin: 60, moodGain: 9 },
  { durationMin: 120, moodGain: 15 },
];

const DEFAULT_COAST_WALK_TIER = COAST_WALK_TIERS[1];
const TRAIN_FARE = 3;
const SUMMER_FESTIVAL_PREPARATION_DURATION_MIN = 90;
const SUMMER_FESTIVAL_DURATION_MIN = 180;
const SUMMER_FESTIVAL_MOOD_GAIN = 20;

/**
 * 判断角色是否位于月汐海岸。
 *
 * @param major 当前角色所在的大地点枚举值
 */
function isAtCoast(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.CoastArea &&
    context.characterStateData.location.minor === CoastAreaSubScene.Beach
  );
}

/**
 * 将 LLM 给出的散步时长收敛到海岸支持的预设档位。
 *
 * @param llmDurationMin LLM 决策给出的分钟数，可为空或任意正数
 * @returns 与海岸散步规则匹配的最终档位
 */
function resolveCoastWalkTier(llmDurationMin?: number): CoastWalkTier {
  if (!llmDurationMin || llmDurationMin <= 0) {
    return DEFAULT_COAST_WALK_TIER;
  }

  return (
    COAST_WALK_TIERS.find((tier) => llmDurationMin <= tier.durationMin) ??
    COAST_WALK_TIERS[COAST_WALK_TIERS.length - 1]
  );
}

export const coastAction: ActionMetadata[] = [
  {
    action: ActionId.Help_Prepare_Summer_Festival,
    description:
      "在月汐海岸帮忙准备8月15日晚上的夏日祭。每天只能帮忙一次，总共完成10次准备后夏日祭才能举行。[体力-12][饱腹-8][耗时90分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      const festival = context.worldState.summerFestival;
      const preparationEndsAt = context.worldState.time.add(
        SUMMER_FESTIVAL_PREPARATION_DURATION_MIN,
        "minute",
      );

      return allTrue([
        () => isAtCoast(context),
        () => festival.preparationCount < festival.requiredPreparationCount,
        () => preparationEndsAt.valueOf() <= Date.parse(festival.scheduledAt),
        () => notDoneToday(context, ActionId.Help_Prepare_Summer_Festival),
        () => context.characterStateData.stamina >= 12,
        () => context.characterStateData.satiety >= 8,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Help_Prepare_Summer_Festival);
    },
    async completionEvent(context) {
      await context.characterState.changeStamina(-12);
      await context.characterState.changeSatiety(-8);
      await context.characterState.markActionDoneToday(ActionId.Help_Prepare_Summer_Festival);
      await worldStateRunner.consumeCommandsAndRunTick([
        {
          type: "advance_summer_festival_preparation",
        },
      ]);

      const festival = (await context.worldState.getData()).summerFestival;
      context.runtimeState.actionSummaryText = `悠酱在月汐海岸帮忙准备了90分钟夏日祭，消耗了12点体力和8点饱腹，准备进度推进到了${festival.preparationCount}/${festival.requiredPreparationCount}`;

      return {
        completionContext: {
          preparationCount: festival.preparationCount,
          requiredPreparationCount: festival.requiredPreparationCount,
          staminaChange: -12,
          satietyChange: -8,
        },
      };
    },
    durationMin: SUMMER_FESTIVAL_PREPARATION_DURATION_MIN,
  },
  {
    action: ActionId.Attend_Summer_Festival,
    description:
      "参加在月汐海岸举行的夏日祭，感受灯火、摊位与海风交织的夏夜。[心情基础恢复+20][耗时180分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      const festival = context.worldState.summerFestival;
      const scheduledAt = Date.parse(festival.scheduledAt);
      const festivalEveningEndsAt = scheduledAt + 4 * 60 * 60 * 1000;

      return allTrue([
        () => isAtCoast(context),
        () => festival.preparationCount === festival.requiredPreparationCount,
        () => festival.heldAt === null,
        () => context.worldState.time.valueOf() >= scheduledAt,
        () => context.worldState.time.valueOf() < festivalEveningEndsAt,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Attend_Summer_Festival);
      const heldAt = context.worldState.summerFestival.scheduledAt;
      await worldStateRunner.consumeCommandsAndRunTick([
        {
          type: "hold_summer_festival",
          heldAt,
        },
      ]);

      return {
        startContext: {
          heldAt,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const festivalContext = runningAction.startContext as {
        heldAt: string;
      };
      const actualMoodGain = await context.characterState.recoverMood(SUMMER_FESTIVAL_MOOD_GAIN);

      context.runtimeState.actionSummaryText = `悠酱在月汐海岸参加了180分钟的夏日祭，在灯火、摊位和海风交织的夏夜里度过了祭典，${buildMoodChangeDescription(actualMoodGain)}`;

      return {
        completionContext: {
          heldAt: festivalContext.heldAt,
          actionMoodChange: {
            base: SUMMER_FESTIVAL_MOOD_GAIN,
            actual: actualMoodGain,
          },
        },
      };
    },
    durationMin: SUMMER_FESTIVAL_DURATION_MIN,
  },
  {
    action: ActionId.Walk_In_Coast,
    description:
      "在月汐海岸散步放松，可以按 10/30/60/120 分钟四档安排时长，时间越久基础心情恢复越多。散步时可能会捡到海岸的高价值物品。[耗时需要给出]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtCoast(context);
    },
    async executor(context, selectedAction) {
      const selectedTier = resolveCoastWalkTier(selectedAction.durationMinute);

      await context.characterState.setAction(ActionId.Walk_In_Coast);

      return {
        executionResult: `开始在月汐海岸散步，预计${selectedTier.durationMin}分钟`,
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
        setting: `在月汐海岸散步${walkContext.durationMin}分钟期间发生的日常小事件，可以涉及游客、海鸟、海浪、海滩设施或天气带来的小插曲`,
        triggerProbability: 0.2,
        positiveProbability: 0.4,
      });
      const worldStateData = await context.worldState.getData();
      const coastResources = worldStateData.scenes[WorldSubScene.Coast].resources ?? [];
      const collectedResources = coastResources.filter((resource) => resource.amount > 0);
      const consumeCommands = collectedResources.map((resource) => ({
        type: "consume_scene_resource" as const,
        scene: WorldSubScene.Coast,
        resource: resource.name,
        amount: resource.amount,
      }));

      if (consumeCommands.length > 0) {
        await worldStateRunner.consumeCommandsAndRunTick(consumeCommands, new Date());
      }

      for (const resource of collectedResources) {
        const item = COAST_VALUABLE_ITEMS.find((candidate) => candidate.name === resource.name);
        if (!item) {
          logger.error(
            "[action: walk in coast]",
            `Coast walk resource item not found: ${resource.name}`,
          );
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
        actionSummaryText: `悠酱在月汐海岸散步了${walkContext.durationMin}分钟，散步本身让${buildMoodChangeDescription(actualMoodGain)}${collectedItemText}`,
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
      return resolveCoastWalkTier(selectedAction?.durationMinute).durationMin;
    },
  },
  {
    action: ActionId.Take_Train_To_Train_Station_From_Coast,
    description: "从月汐海岸乘电车回羽浦町站。[金币-3][体力-7][饱腹-5][耗时15分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtCoast(context),
        () => context.characterStateData.money >= TRAIN_FARE,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Take_Train_To_Train_Station_From_Coast);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.TrainStation,
      });
      await context.characterState.changeMoney(-TRAIN_FARE);
      await context.characterState.changeStamina(-7);
      await context.characterState.changeSatiety(-5);
    },
    durationMin: 15,
  },
];
