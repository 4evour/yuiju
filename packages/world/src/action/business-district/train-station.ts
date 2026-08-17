import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  allTrue,
  BusinessDistrictSubScene,
  CoastAreaSubScene,
  MajorScene,
} from "@yuiju/utils";

const TRAIN_FARE = 3;

function isAtTrainStation(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.BusinessDistrict &&
    context.characterStateData.location.minor === BusinessDistrictSubScene.TrainStation
  );
}

export const trainStationAction: ActionMetadata[] = [
  {
    action: ActionId.Go_To_Shop_From_Train_Station,
    description: "从羽浦站前往小町商店。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtTrainStation(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Shop_From_Train_Station);
      await context.characterState.setLocation({
        major: MajorScene.BusinessDistrict,
        minor: BusinessDistrictSubScene.Shop,
      });
      await context.characterState.changeStamina(-1);
      await context.characterState.changeSatiety(-1);
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Supermarket_From_Train_Station,
    description: "从羽浦站前往超市。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtTrainStation(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Supermarket_From_Train_Station);
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
    action: ActionId.Go_To_Diner_From_Train_Station,
    description: "从羽浦站前往日和食堂。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtTrainStation(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Diner_From_Train_Station);
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
    action: ActionId.Go_To_Cafe_From_Train_Station,
    description: "从羽浦站前往薄暮咖啡。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtTrainStation(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Cafe_From_Train_Station);
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
    action: ActionId.Take_Train_To_Coast_From_Train_Station,
    description: `从羽浦站乘电车前往月汐海岸。[金币-3][体力-7][饱腹-5][需金币≥${TRAIN_FARE * 2}][耗时15分钟]`,
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtTrainStation(context),
        // 预留往返车费：离开海岸的唯一方式是乘电车返回，同样需要 TRAIN_FARE
        () => context.characterStateData.money >= TRAIN_FARE * 2,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Take_Train_To_Coast_From_Train_Station);
      await context.characterState.setLocation({
        major: MajorScene.CoastArea,
        minor: CoastAreaSubScene.Beach,
      });
      await context.characterState.changeMoney(-TRAIN_FARE);
      await context.characterState.changeStamina(-7);
      await context.characterState.changeSatiety(-5);
    },
    durationMin: 15,
  },
];
