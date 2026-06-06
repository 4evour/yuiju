import { tool } from "ai";
import { z } from "zod";
import { initCharacterStateData } from "../../redis";
import { InventoryItemCategory } from "../../types";

export const queryAvailableInventoryItems = tool({
  description: "查询当前背包中的可用物品列表",
  inputSchema: z.object({
    category: z
      .array(z.enum([InventoryItemCategory.Food, InventoryItemCategory.Ingredient]))
      .min(1)
      .describe("要查询的背包物品类别。food 是可直接吃的食物，ingredient 是做饭食材。"),
  }),
  execute: async ({ category }) => {
    const characterState = await initCharacterStateData();
    const inventory = characterState.inventory || [];
    const availableItems = inventory.filter(
      (item) =>
        item.categories.some((itemCategory) => category.includes(itemCategory)) &&
        item.quantity > 0,
    );

    if (availableItems.length === 0) {
      return "背包中没有符合条件的可用物品";
    }

    return availableItems.map((item) => {
      return {
        value: item.name,
        categories: item.categories,
        description: `${item.description}（剩余${item.quantity}个）`,
      };
    });
  },
});
