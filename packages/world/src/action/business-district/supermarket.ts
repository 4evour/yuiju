import {
  type ActionContext,
  ActionId,
  type ActionMetadata,
  allTrue,
  BusinessDistrictSubScene,
  type ChoiceOption,
  CoastAreaSubScene,
  HomeSubScene,
  InventoryItemCategory,
  MajorScene,
  planManager,
  SchoolSubScene,
  SUPERMARKET_PRODUCTS,
  type SupermarketProduct,
} from "@yuiju/utils";
import { chooseSupermarketProductAgent } from "@/llm/agent";
import { logger } from "@/utils/logger";

const SUPERMARKET_MIN_PRICE = Math.min(...SUPERMARKET_PRODUCTS.map((p) => p.price));

function isAtSupermarket(context: ActionContext) {
  return (
    context.characterStateData.location.major === MajorScene.BusinessDistrict &&
    context.characterStateData.location.minor === BusinessDistrictSubScene.Supermarket
  );
}

function formatSupermarketProductDescription(product: SupermarketProduct) {
  return `${product.description}[价格${product.price}金币]`;
}

export const supermarketAction: ActionMetadata[] = [
  {
    action: ActionId.Buy_Ingredient_At_Supermarket,
    description: "在超市购买食材，一次只能选择一种食材，可购买多个。[耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSupermarket(context),
        () => context.characterStateData.money >= SUPERMARKET_MIN_PRICE,
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Buy_Ingredient_At_Supermarket);

      let remainingMoney = context.characterStateData.money;
      const productList: ChoiceOption[] = SUPERMARKET_PRODUCTS.map((product) => {
        return {
          value: product.name,
          description: formatSupermarketProductDescription(product),
        };
      });

      const selectedProduct = await chooseSupermarketProductAgent(
        productList,
        context,
        [],
        await planManager.getState(),
      );
      if (!selectedProduct) {
        logger.error("[Buy_Ingredient_At_Supermarket] 没有选择食材");
        return { executionResult: "购买失败，没有选择食材。" };
      }

      const product = SUPERMARKET_PRODUCTS.find((p) => p.name === selectedProduct.value);
      if (!product) {
        logger.error(`[Buy_Ingredient_At_Supermarket] 未找到食材: ${selectedProduct.value}`);
        return { executionResult: "购买失败，未找到食材。" };
      }

      const desiredQuantity = selectedProduct.quantity ?? 1;
      const maxAffordable = Math.floor(remainingMoney / product.price);
      if (maxAffordable <= 0) {
        logger.info(
          `[Buy_Ingredient_At_Supermarket] 余额不足，跳过购买: ${product.name}（单价${product.price}元，余额${remainingMoney}元）`,
        );
        return { executionResult: "购买失败，余额不足。" };
      }

      const quantity = Math.min(Math.max(1, desiredQuantity), maxAffordable);
      if (quantity !== desiredQuantity) {
        logger.info(
          `[Buy_Ingredient_At_Supermarket] 购买数量已裁剪: ${product.name} ${desiredQuantity} -> ${quantity}（余额${remainingMoney}元）`,
        );
      }

      const cost = product.price * quantity;
      await context.characterState.changeMoney(-cost);
      remainingMoney -= cost;

      logger.info(
        `[Buy_Ingredient_At_Supermarket] 购买成功: ${product.name} x${quantity}，花费${cost}元，剩余${remainingMoney}元`,
      );

      return {
        executionResult: `买了${product.name}${quantity}份，花费${cost}元，等待结账装袋`,
        startContext: {
          productName: product.name,
          description: product.description,
          quantity,
          metadata: product.metadata,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const purchaseContext = runningAction.startContext as {
        productName: string;
        description: string;
        quantity: number;
        metadata: SupermarketProduct["metadata"];
      };

      await context.characterState.addItem(
        {
          name: purchaseContext.productName,
          description: purchaseContext.description,
          category: InventoryItemCategory.Ingredient,
          metadata: purchaseContext.metadata,
        },
        purchaseContext.quantity,
      );

      return {
        completionContext: {
          purchasedItem: {
            name: purchaseContext.productName,
            quantity: purchaseContext.quantity,
          },
        },
        eventDescription: `买到了${purchaseContext.productName}${purchaseContext.quantity}份`,
      };
    },
    durationMin: 5,
  },
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
