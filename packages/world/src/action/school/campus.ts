import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  allTrue,
  BusinessDistrictSubScene,
  HomeSubScene,
  MajorScene,
  SchoolSubScene,
} from "@yuiju/utils";
import { isAfternoon, isNight, isWeekday } from "../utils";

function isAtSchoolCampus(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.School &&
    context.characterStateData.location.minor === SchoolSubScene.Campus
  );
}

export const schoolAction: ActionMetadata[] = [
  {
    // TODO：逻辑优化，上课时间应该是固定的时间段，而不是随时可以上课
    action: ActionId.Study_At_School,
    description: "在星见丘高校上课。[体力-12][饱腹-12][心情-5][耗时动态]",
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
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Study_At_School);
    },
    async completionEvent(context) {
      await context.characterState.changeStamina(-12);
      await context.characterState.changeSatiety(-12);
      await context.characterState.changeMood(-5);
      return { eventDescription: "上课结束了" };
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
    description: "从星见丘高校回家。[体力-7][饱腹-5][耗时20分钟]",
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
