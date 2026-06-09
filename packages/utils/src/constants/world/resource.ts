import { InventoryItemCategory, type InventoryItemMetadata } from "../../types";

export enum ParkFruitResourceName {
  WildBerry = "野莓",
  Cherry = "樱桃",
  CherryTomato = "小番茄",
  Cucumber = "黄瓜",
}

export enum CoastValuableItemResourceName {
  PatternShell = "花纹贝壳",
  SeaGlass = "海玻璃",
  TideStone = "潮纹石",
  OldGlassBottle = "旧玻璃瓶",
  Clam = "蛤蜊",
  SeaSnail = "海螺",
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
    name: ParkFruitResourceName.Cherry,
    description: "枝头熟透的樱桃，小小一把就很甜，适合边走边摘。",
    categories: [InventoryItemCategory.Food, InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 5,
      satiety: 12,
      mood: 1,
      salePrice: 12,
    },
  },
  {
    name: ParkFruitResourceName.CherryTomato,
    description: "圆滚滚的小番茄，带一点清甜汁水，也能拿回家做饭。",
    categories: [InventoryItemCategory.Food, InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 6,
      satiety: 16,
      mood: 2,
      salePrice: 20,
    },
  },
  {
    name: ParkFruitResourceName.Cucumber,
    description: "刚摘下来的黄瓜，脆生生的，带着一点清凉水气。",
    categories: [InventoryItemCategory.Food, InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 4,
      satiety: 10,
      mood: 1,
      salePrice: 10,
    },
  },
];

export const COAST_VALUABLE_ITEMS: SceneResourceItem[] = [
  {
    name: CoastValuableItemResourceName.PatternShell,
    description: "壳面有自然潮纹的贝壳，完整又好看，适合拿去售卖。",
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
    name: CoastValuableItemResourceName.TideStone,
    description: "被潮水磨出纹理的圆润石头，少见又耐看，能卖个好价钱。",
    categories: [InventoryItemCategory.Valuable],
    metadata: {
      salePrice: 180,
    },
  },
  {
    name: CoastValuableItemResourceName.OldGlassBottle,
    description: "被海风和盐分磨旧的玻璃瓶，瓶身还算完整，带一点旧时光的味道。",
    categories: [InventoryItemCategory.Valuable],
    metadata: {
      salePrice: 70,
    },
  },
  {
    name: CoastValuableItemResourceName.SeaSnail,
    description: "海螺壳纹清楚，里面的肉还能处理成食材，也能拿去卖掉。",
    categories: [InventoryItemCategory.Ingredient],
    metadata: {
      stamina: 6,
      satiety: 18,
      mood: 1,
      salePrice: 20,
    },
  },
];
