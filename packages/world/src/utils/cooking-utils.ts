import {
  type ActionContext,
  type ChoiceOption,
  type FoodMetadata,
  InventoryItemCategory,
} from "@yuiju/utils";

export type CookingIngredientSnapshot = {
  name: string;
  quantity: number;
  metadata?: FoodMetadata;
};

type CookingStartContext = {
  ingredients: CookingIngredientSnapshot[];
};

const SINGLE_INGREDIENT_MEAL_NAMES: Record<string, string[]> = {
  白米: ["盐饭团", "热米饭"],
  鸡蛋: ["煎鸡蛋", "温泉蛋"],
  豆腐: ["温豆腐", "煎豆腐"],
  卷心菜: ["清炒卷心菜", "卷心菜汤"],
  味噌: ["味噌汤"],
  速冻乌冬: ["热乌冬", "清汤乌冬"],
  鸡腿肉: ["煎鸡腿肉", "照烧鸡腿肉"],
  鲑鱼切身: ["煎鲑鱼", "烤鲑鱼"],
  咖喱块: ["简易咖喱汤"],
  牛奶: ["热牛奶", "牛奶粥"],
  便当菜组合: ["家常便当", "热便当菜"],
  小鲫鱼: ["烤小鲫鱼", "小鲫鱼汤"],
  河鳟: ["烤河鳟", "河鳟汤"],
  银鳞鲤: ["烤银鳞鲤", "银鳞鲤汤"],
};

const COMBINED_INGREDIENT_MEAL_NAMES: Record<string, string[]> = {
  "白米|鸡蛋": ["蛋炒饭", "鸡蛋盖饭"],
  "咖喱块|白米": ["咖喱饭"],
  "白米|鸡腿肉": ["鸡肉盖饭", "鸡肉饭团"],
  "白米|鲑鱼切身": ["鲑鱼饭团", "鲑鱼茶泡饭"],
  "便当菜组合|白米": ["家常便当"],
  "味噌|白米": ["味噌烤饭团", "味噌汤泡饭"],
  "味噌|豆腐": ["味噌豆腐汤"],
  "味噌|速冻乌冬": ["味噌乌冬"],
  "速冻乌冬|鸡蛋": ["月见乌冬"],
  "卷心菜|鸡蛋": ["卷心菜煎蛋", "卷心菜蛋炒"],
  "卷心菜|鸡腿肉": ["鸡肉卷心菜小炒"],
  "卷心菜|鲑鱼切身": ["鲑鱼卷心菜蒸煮"],
  "咖喱块|鸡腿肉": ["鸡肉咖喱"],
  "咖喱块|速冻乌冬": ["咖喱乌冬"],
  "牛奶|鸡蛋": ["牛奶蒸蛋"],
  "牛奶|白米": ["牛奶粥"],
  "味噌|小鲫鱼": ["味噌煮小鲫鱼"],
  "味噌|河鳟": ["味噌煮河鳟"],
  "味噌|银鳞鲤": ["味噌煮银鳞鲤"],
  "小鲫鱼|白米": ["烤小鲫鱼定食"],
  "河鳟|白米": ["烤河鳟定食"],
  "白米|银鳞鲤": ["烤银鳞鲤定食"],
};

export function getAvailableCookingIngredientOptions(context: ActionContext): ChoiceOption[] {
  const inventory = context.characterState.inventory || [];
  return inventory
    .filter((item) => item.category === InventoryItemCategory.Ingredient && item.quantity > 0)
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

export function readCookingStartContext(
  startContext: Record<string, unknown> | undefined,
): CookingStartContext | null {
  const ingredients = startContext?.ingredients;
  if (!Array.isArray(ingredients)) {
    return null;
  }

  const parsedIngredients = ingredients
    .map((ingredient): CookingIngredientSnapshot | null => {
      if (!ingredient || typeof ingredient !== "object") {
        return null;
      }

      const maybeIngredient = ingredient as Partial<CookingIngredientSnapshot>;
      if (typeof maybeIngredient.name !== "string") {
        return null;
      }

      if (
        typeof maybeIngredient.quantity !== "number" ||
        !Number.isFinite(maybeIngredient.quantity) ||
        maybeIngredient.quantity <= 0
      ) {
        return null;
      }

      return {
        name: maybeIngredient.name,
        quantity: maybeIngredient.quantity,
        metadata:
          maybeIngredient.metadata &&
          typeof maybeIngredient.metadata === "object" &&
          !Array.isArray(maybeIngredient.metadata)
            ? (maybeIngredient.metadata as FoodMetadata)
            : undefined,
      };
    })
    .filter((ingredient): ingredient is CookingIngredientSnapshot => Boolean(ingredient));

  return parsedIngredients.length > 0 ? { ingredients: parsedIngredients } : null;
}

export function chooseCookedMealName(ingredientNames: string[]) {
  const recipeKey = [...ingredientNames].sort().join("|");
  const candidates =
    ingredientNames.length === 1
      ? (SINGLE_INGREDIENT_MEAL_NAMES[ingredientNames[0]] ?? [
          `煎${ingredientNames[0]}`,
          `${ingredientNames[0]}汤`,
        ])
      : (COMBINED_INGREDIENT_MEAL_NAMES[recipeKey] ?? [
          `${ingredientNames.join("和")}小炒`,
          `家常${ingredientNames.join("")}`,
          `${ingredientNames.join("和")}热汤`,
        ]);

  return candidates[Math.floor(Math.random() * candidates.length)];
}
