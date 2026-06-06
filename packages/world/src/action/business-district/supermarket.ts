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
import { chooseSellableItemAgent, chooseSupermarketProductAgent } from "@/llm/agent";
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
    description: "在超市购买食材，一次可以选择多种食材，每种可购买多个。[耗时5分钟]",
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

      const selectedProducts = await chooseSupermarketProductAgent(
        productList,
        context,
        [],
        await planManager.getState(),
      );
      if (!selectedProducts?.length) {
        logger.error("[Buy_Ingredient_At_Supermarket] 没有选择食材");
        return { executionResult: "购买失败，没有选择食材。" };
      }

      const selectedQuantityByName = new Map<string, number>();
      for (const selectedProduct of selectedProducts) {
        selectedQuantityByName.set(
          selectedProduct.value,
          (selectedQuantityByName.get(selectedProduct.value) ?? 0) +
            (selectedProduct.quantity ?? 1),
        );
      }

      const purchasedProducts: {
        productName: string;
        description: string;
        quantity: number;
        metadata: SupermarketProduct["metadata"];
      }[] = [];

      let totalCost = 0;
      for (const [productName, desiredQuantity] of selectedQuantityByName) {
        const product = SUPERMARKET_PRODUCTS.find((p) => p.name === productName);
        if (!product) {
          logger.error(`[Buy_Ingredient_At_Supermarket] 未找到食材: ${productName}`);
          return { executionResult: "购买失败，未找到食材。" };
        }

        const maxAffordable = Math.floor(remainingMoney / product.price);
        if (maxAffordable <= 0) {
          logger.info(
            `[Buy_Ingredient_At_Supermarket] 余额不足，跳过购买: ${product.name}（单价${product.price}元，余额${remainingMoney}元）`,
          );
          continue;
        }

        const quantity = Math.min(Math.max(1, desiredQuantity), maxAffordable);
        if (quantity !== desiredQuantity) {
          logger.info(
            `[Buy_Ingredient_At_Supermarket] 购买数量已裁剪: ${product.name} ${desiredQuantity} -> ${quantity}（余额${remainingMoney}元）`,
          );
        }

        const cost = product.price * quantity;
        remainingMoney -= cost;
        totalCost += cost;

        purchasedProducts.push({
          productName: product.name,
          description: product.description,
          quantity,
          metadata: product.metadata,
        });
      }

      if (purchasedProducts.length === 0) {
        return { executionResult: "购买失败，余额不足。" };
      }

      await context.characterState.changeMoney(-totalCost);
      const purchasedProductDescription = purchasedProducts
        .map((product) => `${product.productName}${product.quantity}份`)
        .join("、");

      logger.info(
        `[Buy_Ingredient_At_Supermarket] 购买成功: ${purchasedProducts
          .map((product) => `${product.productName} x${product.quantity}`)
          .join("、")}，花费${totalCost}元，剩余${remainingMoney}元`,
      );

      return {
        executionResult: `买了${purchasedProductDescription}，花费${totalCost}元，等待结账装袋`,
        startContext: {
          purchasedProducts,
          totalCost,
        },
      };
    },
    async completionEvent(context, runningAction) {
      const purchaseContext = runningAction.startContext as {
        purchasedProducts: {
          productName: string;
          description: string;
          quantity: number;
          metadata: SupermarketProduct["metadata"];
        }[];
        totalCost: number;
      };

      for (const product of purchaseContext.purchasedProducts) {
        await context.characterState.addItem(
          {
            name: product.productName,
            description: product.description,
            category: InventoryItemCategory.Ingredient,
            metadata: product.metadata,
          },
          product.quantity,
        );
      }

      const purchasedProductDescription = purchaseContext.purchasedProducts
        .map((product) => `${product.productName}${product.quantity}份`)
        .join("、");

      return {
        completionContext: {
          purchasedProducts: purchaseContext.purchasedProducts.map((product) => ({
            name: product.productName,
            quantity: product.quantity,
          })),
          totalCost: purchaseContext.totalCost,
        },
        eventDescription: `买到了${purchasedProductDescription}`,
      };
    },
    durationMin: 5,
  },
  {
    action: ActionId.Sell_Item_At_Supermarket,
    description: "在超市售卖背包里有售卖价格的物品，一次可以选择多种物品。[金币+?][耗时5分钟]",
    proactiveShare: {
      enabled: true,
    },
    precondition(context) {
      return allTrue([
        () => isAtSupermarket(context),
        () =>
          (context.characterStateData.inventory ?? []).some((item) => {
            return (
              item.quantity > 0 &&
              "salePrice" in item.metadata &&
              item.metadata.salePrice !== undefined
            );
          }),
      ]);
    },
    async executor(context) {
      await context.characterState.setAction(ActionId.Sell_Item_At_Supermarket);

      const sellableItems = (context.characterStateData.inventory ?? []).flatMap((item) => {
        const salePrice = "salePrice" in item.metadata ? item.metadata.salePrice : undefined;

        if (item.quantity <= 0 || salePrice === undefined) {
          return [];
        }

        return [
          {
            item,
            salePrice,
          },
        ];
      });

      const itemList: ChoiceOption[] = sellableItems.map(({ item, salePrice }) => {
        return {
          value: item.name,
          description: `${item.description}（库存${item.quantity}个，售卖价格${salePrice}金币）`,
        };
      });

      const selectedItems = await chooseSellableItemAgent(
        itemList,
        context,
        [],
        await planManager.getState(),
      );
      if (!selectedItems?.length) {
        logger.error("[Sell_Item_At_Supermarket] 没有选择售卖物品");
        return { executionResult: "售卖失败，没有选择物品。" };
      }

      const selectedQuantityByName = new Map<string, number>();
      for (const selectedItem of selectedItems) {
        selectedQuantityByName.set(
          selectedItem.value,
          (selectedQuantityByName.get(selectedItem.value) ?? 0) + (selectedItem.quantity ?? 1),
        );
      }

      const soldItems: {
        itemName: string;
        quantity: number;
        salePrice: number;
        income: number;
      }[] = [];

      for (const [itemName, desiredQuantity] of selectedQuantityByName) {
        const sellableItem = sellableItems.find(({ item }) => item.name === itemName);
        if (!sellableItem) {
          logger.error(`[Sell_Item_At_Supermarket] 未找到可售卖物品: ${itemName}`);
          return { executionResult: "售卖失败，未找到物品。" };
        }

        const quantity = Math.min(Math.max(1, desiredQuantity), sellableItem.item.quantity);
        if (quantity !== desiredQuantity) {
          logger.info(
            `[Sell_Item_At_Supermarket] 售卖数量已裁剪: ${sellableItem.item.name} ${desiredQuantity} -> ${quantity}（库存${sellableItem.item.quantity}个）`,
          );
        }

        soldItems.push({
          itemName: sellableItem.item.name,
          quantity,
          salePrice: sellableItem.salePrice,
          income: sellableItem.salePrice * quantity,
        });
      }

      for (const soldItem of soldItems) {
        const consumed = await context.characterState.consumeItem(
          soldItem.itemName,
          soldItem.quantity,
        );
        if (!consumed) {
          logger.error(
            `[Sell_Item_At_Supermarket] 扣除背包物品失败: ${soldItem.itemName} x${soldItem.quantity}`,
          );
          return { executionResult: "售卖失败，背包物品不足。" };
        }
      }

      const totalIncome = soldItems.reduce((sum, item) => sum + item.income, 0);
      await context.characterState.changeMoney(totalIncome);
      const soldItemDescription = soldItems
        .map((item) => `${item.itemName}${item.quantity}个`)
        .join("、");

      logger.info(
        `[Sell_Item_At_Supermarket] 售卖成功: ${soldItems
          .map((item) => `${item.itemName} x${item.quantity}`)
          .join("、")}，收入${totalIncome}金币`,
      );

      return {
        executionResult: `卖出了${soldItemDescription}，收入${totalIncome}金币，等待超市结算`,
        startContext: {
          soldItems,
          totalIncome,
        },
      };
    },
    completionEvent(_context, runningAction) {
      const saleContext = runningAction.startContext as {
        soldItems: {
          itemName: string;
          quantity: number;
          salePrice: number;
          income: number;
        }[];
        totalIncome: number;
      };
      const soldItemDescription = saleContext.soldItems
        .map((item) => `${item.itemName}${item.quantity}个`)
        .join("、");

      return {
        completionContext: {
          soldItems: saleContext.soldItems,
          totalIncome: saleContext.totalIncome,
        },
        eventDescription: `在超市卖出了${soldItemDescription}，收入${saleContext.totalIncome}金币`,
      };
    },
    durationMin: 5,
  },
  {
    action: ActionId.Go_Home_From_Supermarket,
    description: "从超市回家。[体力-5][饱腹-3][耗时20分钟]",
    proactiveShare: {
      enabled: true,
    },
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
    proactiveShare: {
      enabled: true,
    },
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
    proactiveShare: {
      enabled: true,
    },
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
    proactiveShare: {
      enabled: true,
    },
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
    proactiveShare: {
      enabled: true,
    },
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
