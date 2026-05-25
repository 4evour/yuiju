import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  InventoryItemCategory,
  MajorScene,
  ParkAreaSubScene,
} from "@yuiju/utils";

const POND_FISHING_RESULTS = [
  {
    name: "小鲫鱼",
    description: "从水音池钓到的小鲫鱼，可以作为做饭食材。",
    metadata: {
      salePrice: 18,
      stamina: 5,
      satiety: 14,
      mood: 1,
    },
    probability: 45,
  },
  {
    name: "河鳟",
    description: "从水音池钓到的河鳟，肉质清爽，可以作为做饭食材。",
    metadata: {
      salePrice: 36,
      stamina: 7,
      satiety: 18,
      mood: 3,
    },
    probability: 25,
  },
  {
    name: "银鳞鲤",
    description: "从水音池钓到的少见鲤鱼，鳞片带着淡淡银光，可以作为做饭食材。",
    metadata: {
      salePrice: 80,
      stamina: 9,
      satiety: 22,
      mood: 4,
    },
    probability: 10,
  },
];

function isAtPond(context: ActionContext) {
  return (
    context.characterState.location.major === MajorScene.ParkArea &&
    context.characterState.location.minor === ParkAreaSubScene.Pond
  );
}

export const pondAction: ActionMetadata[] = [
  {
    action: ActionId.Fish_At_Pond,
    description:
      "在水音池钓鱼，有概率钓到可以做饭、未来也可以售卖的鱼，也可能空手而归。[耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtPond(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Fish_At_Pond);
      return { executionResult: "在水音池边放下鱼线，开始等鱼上钩" };
    },
    async completionEvent(context) {
      const roll = Math.random() * 100;
      if (roll < 20) {
        return {
          completionContext: {
            caughtFish: null,
          },
          eventDescription: "在水音池钓了一会儿鱼，但这次没有鱼上钩",
        };
      }

      let accumulatedProbability = 20;
      for (const fish of POND_FISHING_RESULTS) {
        accumulatedProbability += fish.probability;
        if (roll < accumulatedProbability) {
          await context.characterState.addItem(
            {
              name: fish.name,
              description: fish.description,
              category: InventoryItemCategory.Ingredient,
              metadata: fish.metadata,
            },
            1,
          );

          return {
            completionContext: {
              caughtFish: {
                name: fish.name,
                quantity: 1,
                salePrice: fish.metadata.salePrice,
              },
            },
            eventDescription: `在水音池钓到了一条${fish.name}`,
          };
        }
      }
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Park_From_Pond,
    description: "从水音池回到南风公园。[体力-3][饱腹-2][耗时10分钟]",
    precondition(context) {
      return isAtPond(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Park_From_Pond);
      await context.characterState.setLocation({
        major: MajorScene.ParkArea,
        minor: ParkAreaSubScene.Park,
      });
      await context.characterState.changeStamina(-3);
      await context.characterState.changeSatiety(-2);
    },
    durationMin: 10,
  },
];
