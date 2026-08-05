import { SHOP_PRODUCTS, type ShopProduct } from "@yuiju/utils/constants/world/shop";
import { planManager } from "@yuiju/utils/memory/plan/manager";
import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  type ChoiceOption,
} from "@yuiju/utils/types/action";
import {
  BusinessDistrictSubScene,
  HomeSubScene,
  InventoryItemCategory,
  MajorScene,
  SchoolSubScene,
} from "@yuiju/utils/types/state";
import { allTrue } from "@yuiju/utils/utils";
import { chooseShopProductAgent } from "@/llm/agent/business-district";
import { logger } from "@/utils/logger";
import { buildFoodMetadata } from "../../utils/food-utils";

const SHOP_MIN_PRICE = Math.min(...SHOP_PRODUCTS.map((p) => p.price));

function isAtShop(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.BusinessDistrict &&
    context.characterStateData.location.minor === BusinessDistrictSubScene.Shop
  );
}

function formatProductDescription(product: ShopProduct) {
  const description: string[] = [];
  if (product.stamina) {
    description.push(`[体力+${product.stamina}]`);
  }

  if (product.satiety) {
    description.push(`[饱腹+${product.satiety}]`);
  }

  if (product.mood) {
    description.push(`[心情基础恢复+${product.mood}]`);
  }

  return `${product.description}${description.join("")}`;
}

export const shopAction: ActionMetadata[] = [
  {
    action: ActionId.Buy_Item_At_Shop,
    description: "在小町商店购买零食，一次只能购买一件商品。[耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtShop(context),
        () => context.characterStateData.money >= SHOP_MIN_PRICE,
      ]);
    },
    async executor(context, selectedAction) {
      await context.characterState.setAction(ActionId.Buy_Item_At_Shop);

      let remainingMoney = context.characterStateData.money;

      const productList: ChoiceOption[] = SHOP_PRODUCTS.map((product) => {
        return {
          value: product.name,
          description: formatProductDescription(product),
        };
      });

      const selectedProduct = await chooseShopProductAgent(
        productList,
        context,
        selectedAction.reason,
        [],
        await planManager.getState(),
      );
      if (!selectedProduct) {
        logger.error("[Buy_Item_At_Shop] 没有选择商品");
        return { executionResult: "购买失败，没有选择商品。" };
      }

      const product = SHOP_PRODUCTS.find((p) => p.name === selectedProduct.value);
      if (!product) {
        logger.error(`[Buy_Item_At_Shop] 未找到商品: ${selectedProduct.value}`);
        return { executionResult: "购买失败，未找到商品。" };
      }

      const desiredQuantity = selectedProduct.quantity ?? 1;
      const maxAffordable = Math.floor(remainingMoney / product.price);
      if (maxAffordable <= 0) {
        logger.info(
          `[Buy_Item_At_Shop] 余额不足，跳过购买: ${product.name}（单价${product.price}元，余额${remainingMoney}元）`,
        );
        return { executionResult: "购买失败，余额不足。" };
      }

      const quantity = Math.min(Math.max(1, desiredQuantity), maxAffordable);
      if (quantity !== desiredQuantity) {
        logger.info(
          `[Buy_Item_At_Shop] 购买数量已裁剪: ${product.name} ${desiredQuantity} -> ${quantity}（余额${remainingMoney}元）`,
        );
      }

      const cost = product.price * quantity;
      await context.characterState.changeMoney(-cost);
      remainingMoney -= cost;

      logger.info(
        `[Buy_Item_At_Shop] 购买成功: ${product.name} x${quantity}，花费${cost}元，剩余${remainingMoney}元`,
      );

      return {
        executionResult: `买了${product.name}${quantity}个，花费${cost}元，等待取货`,
        startContext: {
          productName: product.name,
          description: product.description,
          quantity,
          stamina: product.stamina,
          satiety: product.satiety,
          mood: product.mood,
          fallbackSatiety: Math.round(product.price / 5),
        },
      };
    },
    async completionEvent(context, runningAction) {
      const purchaseContext = runningAction.startContext as {
        productName: string;
        description: string;
        quantity: number;
        stamina?: number;
        satiety?: number;
        mood?: number;
        fallbackSatiety: number;
      };

      await context.characterState.addItem(
        {
          name: purchaseContext.productName,
          description: purchaseContext.description,
          categories: [InventoryItemCategory.Food],
          metadata: buildFoodMetadata({
            stamina: purchaseContext.stamina,
            satiety: purchaseContext.satiety,
            mood: purchaseContext.mood,
            fallbackSatiety: purchaseContext.fallbackSatiety,
          }),
        },
        purchaseContext.quantity,
      );

      context.runtimeState.actionSummaryText = `悠酱拿到了${purchaseContext.productName}${purchaseContext.quantity}个`;

      return {
        completionContext: {
          purchasedItem: {
            name: purchaseContext.productName,
            quantity: purchaseContext.quantity,
          },
        },
      };
    },
    durationMin: 10,
  },
  {
    action: ActionId.Go_Home_From_Shop,
    description: "从小町商店回家。[体力-5][饱腹-3][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtShop(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_Home_From_Shop);
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
    action: ActionId.Go_To_School_From_Shop,
    description: "从小町商店前往星见丘高校。[体力-3][饱腹-2][耗时10分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtShop(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_School_From_Shop);
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
    action: ActionId.Go_To_Supermarket_From_Shop,
    description: "从小町商店前往超市。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtShop(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Supermarket_From_Shop);
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
    action: ActionId.Go_To_Train_Station_From_Shop,
    description: "从小町商店前往羽浦站。[体力-1][饱腹-1][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return isAtShop(context);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Go_To_Train_Station_From_Shop);
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
