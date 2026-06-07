import { tool } from "ai";
import { z } from "zod";
import { initCharacterStateData } from "../../redis";
import { InventoryItemCategory } from "../../types";

export const queryAvailableInventoryItems = tool({
  description: "查询背包的可用物品的信息",
  inputSchema: z.object({
    category: z
      .array(
        z.enum([
          InventoryItemCategory.Food,
          InventoryItemCategory.Ingredient,
          InventoryItemCategory.Valuable,
        ]),
      )
      .min(1)
      .describe("物品类别。food 是可直接吃的食物，ingredient 是做饭食材，valuable 是高价值物品。"),
  }),
  execute: async ({ category }) => {
    const characterState = await initCharacterStateData();
    const inventory = characterState.inventory || [];
    const availableItems = inventory.filter(
      (item) =>
        item.categories.some((itemCategory) => category?.includes(itemCategory)) &&
        item.quantity > 0,
    );

    if (availableItems.length === 0) {
      return "背包中没有符合条件的可用物品";
    }

    return availableItems.map((item) => {
      const extra: Record<string, any> = {};

      if (item.metadata?.salePrice) {
        extra.salePrice = item.metadata?.salePrice;
      }

      return {
        value: item.name,
        categories: item.categories,
        description: `${item.description}（剩余${item.quantity}个）`,
        ...extra,
      };
    });
  },
});
