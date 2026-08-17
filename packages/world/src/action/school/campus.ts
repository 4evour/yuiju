import { type ActionContext, ActionId, type ActionMetadata } from "@yuiju/utils/types/action";
import {
  BusinessDistrictSubScene,
  HomeSubScene,
  MajorScene,
  SchoolSubScene,
} from "@yuiju/utils/types/state";
import { allTrue } from "@yuiju/utils/utils";
import {
  buildActionRandomEventDescription,
  buildMoodChangeDescription,
  generateActionRandomEvent,
} from "@/llm/agent/random-event";
import { isAfternoon, isNight, isWeekday } from "../utils";

function isAtSchoolCampus(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.School &&
    context.characterStateData.location.minor === SchoolSubScene.Campus
  );
}

/** 上课消耗 12 体力，且下课后「从学校回家」要求体力 ≥ 10，预留两者之和 */
const STUDY_REQUIRED_STAMINA = 22;

export const schoolAction: ActionMetadata[] = [
  {
    // TODO：逻辑优化，上课时间应该是固定的时间段，而不是随时可以上课
    action: ActionId.Study_At_School,
    description: `在星见丘高校上课。[体力-12][饱腹-12][心情-5][需体力≥${STUDY_REQUIRED_STAMINA}][耗时动态]`,
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSchoolCampus(context),
        () => {
          // 上课时间：9点-12点、14点-16点
          const hour = context.worldState.time.hour();
          return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 16);
        },
        isWeekday(context),
        context.characterStateData.stamina >= STUDY_REQUIRED_STAMINA,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Study_At_School);
    },
    async completionEvent(context) {
      const randomEvent = await generateActionRandomEvent({
        context,
        setting: "在星见丘高校上课期间发生的日常小事件，可以涉及课堂内容、老师、同学或课间互动",
        triggerProbability: 0.2,
        positiveProbability: 0.4,
      });
      await context.characterState.changeStamina(-12);
      await context.characterState.changeSatiety(-12);
      const actualStudyMoodChange = await context.characterState.changeMood(-5);
      const randomEventResult = randomEvent
        ? {
            ...randomEvent,
            actualMoodChange: await context.characterState.changeMood(randomEvent.moodChange),
          }
        : undefined;
      const randomEventCompletion = buildActionRandomEventDescription({
        actionSummaryText: `悠酱上完了课，上课本身让${buildMoodChangeDescription(actualStudyMoodChange)}`,
        actionMoodChange: actualStudyMoodChange,
        randomEvent: randomEventResult,
      });
      context.runtimeState.actionSummaryText = randomEventCompletion.actionSummaryText;

      return {
        completionContext: {
          staminaDelta: -12,
          satietyDelta: -12,
          actionMoodChange: {
            base: -5,
            actual: actualStudyMoodChange,
          },
          randomEvent: randomEventResult,
          totalMoodChange: randomEventCompletion.totalMoodChange,
        },
        eventDescription: randomEventCompletion.eventDescription,
      };
    },
    durationMin: async (context) => {
      const now = context.worldState.time.clone();
      // 如果是上午，上课到12点；如果是下午，上课到16点
      const hour = now.hour();
      let targetHour = 12;
      if (hour >= 14) {
        targetHour = 16;
      }

      const target = now.hour(targetHour).minute(0).second(0).millisecond(0);
      return target.diff(now, "minute");
    },
  },
  {
    action: ActionId.Go_Home_From_School,
    description: "从星见丘高校回家。[体力-7][饱腹-5][仅限下午][需体力≥10][耗时20分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSchoolCampus(context),
        context.characterStateData.stamina >= 10,
        isAfternoon(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_Home_From_School);
      await context.characterState.setLocation({
        major: MajorScene.Home,
        minor: HomeSubScene.House,
      });

      await context.characterState.changeStamina(-7);
      await context.characterState.changeSatiety(-5);
    },
    durationMin: 20,
  },
  {
    action: ActionId.Go_To_Shop_From_School,
    description: "从星见丘高校前往小町商店。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSchoolCampus(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Shop_From_School);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Shop,
      });

      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Cafe_From_School,
    description: "从星见丘高校去薄暮咖啡。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSchoolCampus(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Cafe_From_School);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Cafe,
      });

      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Supermarket_From_School,
    description: "从星见丘高校前往超市。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSchoolCampus(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Supermarket_From_School);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Supermarket,
      });

      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_To_Diner_From_School,
    description: "从星见丘高校前往日和食堂。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSchoolCampus(context),
        context.characterStateData.stamina >= 5,
        !isNight(context),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Diner_From_School);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Diner,
      });

      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
];
