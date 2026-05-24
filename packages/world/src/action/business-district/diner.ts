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

function isAtDiner(context: ActionContext) {
  return (
    context.characterState.location.major === MajorScene.BusinessDistrict &&
    context.characterState.location.minor === BusinessDistrictSubScene.Diner
  );
}

export const dinerAction: ActionMetadata[] = [
  {
    action: ActionId.Go_Home_From_Diner,
    description: "从日和食堂回家。[体力-5][饱腹-3][耗时20分钟]",
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
    durationMin: 20,
  },
  {
    action: ActionId.Go_To_School_From_Diner,
    description: "从日和食堂前往星见丘高校。[体力-3][饱腹-2][耗时10分钟]",
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
    action: ActionId.Go_To_Coast_From_Diner,
    description: "从日和食堂前往月汐海岸。[体力-7][饱腹-5][耗时30分钟]",
    precondition(context) {
      return isAtDiner(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Coast_From_Diner);
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
