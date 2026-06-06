import {
  type ActionContext,
  type ChoiceOption,
  InventoryItemCategory,
  type InventoryItemMetadata,
} from "@yuiju/utils";

export type CookingIngredientSnapshot = {
  name: string;
  quantity: number;
  metadata?: InventoryItemMetadata;
};

export function getAvailableCookingIngredientOptions(context: ActionContext): ChoiceOption[] {
  const inventory = context.characterStateData.inventory || [];
  return inventory
    .filter(
      (item) => item.categories.includes(InventoryItemCategory.Ingredient) && item.quantity > 0,
    )
    .map((item): ChoiceOption => {
      return {
        value: item.name,
        description: `${item.description}（剩余${item.quantity}个）`,
        extra: {
          metadata: item.metadata,
        },
      };
    });
}
