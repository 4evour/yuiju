import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  BusinessDistrictSubScene,
  CoastAreaSubScene,
  HomeSubScene,
  MajorScene,
  SchoolSubScene,
} from "@yuiju/utils";

function isAtSupermarket(context: ActionContext) {
  return (
    context.characterState.location.major === MajorScene.BusinessDistrict &&
    context.characterState.location.minor === BusinessDistrictSubScene.Supermarket
  );
}

export const supermarketAction: ActionMetadata[] = [
  {
    action: ActionId.Go_Home_From_Supermarket,
    description: "从超市回家。[体力-5][饱腹-3][耗时20分钟]",
    precondition(context) {
      return isAtSupermarket(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_Home_From_Supermarket);
      await context.characterState.setLocation({
        major: MajorScene.Home,
        minor: HomeSubScene.House,
      });
      await context.characterState.changeStamina(-5);
      await context.characterState.changeSatiety(-3);
    },
    durationMin: 20,
  },
  {
    action: ActionId.Go_To_School_From_Supermarket,
    description: "从超市前往星见丘高校。[体力-3][饱腹-2][耗时10分钟]",
    precondition(context) {
      return isAtSupermarket(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_School_From_Supermarket);
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
    action: ActionId.Go_To_Shop_From_Supermarket,
    description: "从超市前往小町商店。[体力-1][饱腹-1][耗时5分钟]",
    precondition(context) {
      return isAtSupermarket(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Shop_From_Supermarket);
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
    action: ActionId.Go_To_Diner_From_Supermarket,
    description: "从超市前往日和食堂。[体力-1][饱腹-1][耗时5分钟]",
    precondition(context) {
      return isAtSupermarket(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Diner_From_Supermarket);
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
    action: ActionId.Go_To_Coast_From_Supermarket,
    description: "从超市前往月汐海岸。[体力-7][饱腹-5][耗时30分钟]",
    precondition(context) {
      return isAtSupermarket(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Coast_From_Supermarket);
      await context.characterState.setLocation({
        major: MajorScene.CoastArea,
        minor: CoastAreaSubScene.Beach,
      });
      await context.characterState.changeStamina(-7);
      await context.characterState.changeSatiety(-5);
    },
    durationMin: 30,
  },
];
