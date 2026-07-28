import { type ActionContext, ActionId, type ActionMetadata } from "@yuiju/utils/types/action";
import { InventoryItemCategory, MajorScene, ParkAreaSubScene } from "@yuiju/utils/types/state";

const POND_CATCH_RESULTS = [
  {
    name: "鲫鱼",
    description: "从水音池钓到的鲫鱼，个头不算大，适合带回家做饭。",
    metadata: {
      salePrice: 18,
      stamina: 5,
      satiety: 14,
      mood: 1,
    },
    probability: 20,
  },
  {
    name: "泥鳅",
    description: "从水音池钓到的泥鳅，滑溜溜的，也能处理成食材。",
    metadata: {
      salePrice: 16,
      stamina: 4,
      satiety: 12,
      mood: 1,
    },
    probability: 15,
  },
  {
    name: "鲤鱼",
    description: "从水音池钓到的鲤鱼，肉厚一些，认真收拾后可以做成一顿饭。",
    metadata: {
      salePrice: 40,
      stamina: 7,
      satiety: 18,
      mood: 2,
    },
    probability: 12,
  },
  {
    name: "河虾",
    description: "从水音池钓到的河虾，数量不算多，但收拾干净后也能下锅。",
    metadata: {
      salePrice: 22,
      stamina: 5,
      satiety: 13,
      mood: 1,
    },
    probability: 10,
  },
  {
    name: "鳑鲏",
    description: "从水音池钓到的鳑鲏，小小一尾，算是池边常见的渔获。",
    metadata: {
      salePrice: 14,
      stamina: 4,
      satiety: 10,
      mood: 1,
    },
    probability: 8,
  },
  {
    name: "麦穗鱼",
    description: "从水音池钓到的麦穗鱼，细小灵活，攒起来也能做成一道菜。",
    metadata: {
      salePrice: 15,
      stamina: 4,
      satiety: 11,
      mood: 1,
    },
    probability: 7,
  },
  {
    name: "鳊鱼",
    description: "从水音池钓到的鳊鱼，鱼身扁一些，算是今天运气不错的收获。",
    metadata: {
      salePrice: 52,
      stamina: 8,
      satiety: 20,
      mood: 3,
    },
    probability: 7,
  },
  {
    name: "鲶鱼",
    description: "从水音池钓到的鲶鱼，算是少见的大收获，可以卖个更好的价钱。",
    metadata: {
      salePrice: 78,
      stamina: 9,
      satiety: 22,
      mood: 4,
    },
    probability: 3,
  },
];

function isAtPond(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.ParkArea &&
    context.characterStateData.location.minor === ParkAreaSubScene.Pond
  );
}

export const pondAction: ActionMetadata[] = [
  {
    action: ActionId.Fish_At_Pond,
    description:
      "在水音池钓鱼，有概率钓到可以做饭、未来也可以售卖的渔获，也可能空手而归。[耗时5分钟]",
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
        context.runtimeState.actionSummaryText = "悠酱在水音池钓了一会儿鱼，但这次没有鱼上钩";
        return {
          completionContext: {
            catchResult: null,
          },
        };
      }

      let accumulatedProbability = 20;
      for (const catchItem of POND_CATCH_RESULTS) {
        accumulatedProbability += catchItem.probability;
        if (roll < accumulatedProbability) {
          await context.characterState.addItem(
            {
              name: catchItem.name,
              description: catchItem.description,
              categories: [InventoryItemCategory.Ingredient],
              metadata: catchItem.metadata,
            },
            1,
          );

          context.runtimeState.actionSummaryText = `悠酱在水音池钓到了${catchItem.name}`;
          return {
            completionContext: {
              catchResult: {
                name: catchItem.name,
                quantity: 1,
                salePrice: catchItem.metadata.salePrice,
              },
            },
          };
        }
      }
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_To_Park_From_Pond,
    description: "从水音池回到南风公园。[体力-3][饱腹-2][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
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
    durationMin: 5,
  },
];
