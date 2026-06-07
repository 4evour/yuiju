import { InventoryItemCategory, type InventoryItemMetadata } from "../../types";

export enum ParkFruitResourceName {
  WildBerry = "野莓",
  GreenApple = "青苹果",
  NanfengPeach = "南风桃",
}

export enum CoastValuableItemResourceName {
  StarSandShell = "星砂贝壳",
  SeaGlass = "海玻璃",
  MoonTidePearl = "月汐珍珠",
}

export type SceneResourceItem = {
  name: string;
  description: string;
  categories: InventoryItemCategory[];
  metadata: InventoryItemMetadata;
};

export const PARK_FRUIT_ITEMS: SceneResourceItem[] = [
  {
    name: ParkFruitResourceName.WildBerry,
    description: "长在灌木边的小浆果，酸甜清爽，一把就能吃掉。",
    categories: [InventoryItemCategory.Food, InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 3,
      satiety: 8,
      mood: 1,
      salePrice: 8,
    },
  },
  {
    name: ParkFruitResourceName.GreenApple,
    description: "脆口的青苹果，带一点青涩香气，适合直接吃。",
    categories: [InventoryItemCategory.Food, InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 5,
      satiety: 12,
      mood: 1,
      salePrice: 12,
    },
  },
  {
    name: ParkFruitResourceName.NanfengPeach,
    description: "熟得正好的南风桃，果肉柔软，甜味很足。",
    categories: [InventoryItemCategory.Food, InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 6,
      satiety: 16,
      mood: 2,
      salePrice: 20,
    },
  },
];

export const COAST_VALUABLE_ITEMS: SceneResourceItem[] = [
  {
    name: CoastValuableItemResourceName.StarSandShell,
    description: "表面带着细碎星光纹路的贝壳，适合拿去售卖。",
    categories: [InventoryItemCategory.Valuable],
    metadata: {
      salePrice: 60,
    },
  },
  {
    name: CoastValuableItemResourceName.SeaGlass,
    description: "被海浪打磨圆润的海玻璃，边缘柔和，颜色清透。",
    categories: [InventoryItemCategory.Valuable],
    metadata: {
      salePrice: 90,
    },
  },
  {
    name: CoastValuableItemResourceName.MoonTidePearl,
    description: "在月汐海岸很少见的珍珠，个头圆润，价值很高。",
    categories: [InventoryItemCategory.Valuable],
    metadata: {
      salePrice: 180,
    },
  },
];
