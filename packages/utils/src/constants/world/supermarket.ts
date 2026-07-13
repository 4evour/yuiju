import type { InventoryItemMetadata } from "../../types/state";

/**
 * 超市可购买食材名称枚举。
 *
 * 说明：
 * - 枚举值使用“展示用中文名”，确保落到背包 item.name 的字符串稳定一致。
 * - 超市商品当前只作为食材进入背包，不直接承担食用恢复。
 */
export enum SupermarketProductName {
  Rice = "白米",
  Egg = "鸡蛋",
  Tofu = "豆腐",
  Cabbage = "卷心菜",
  Miso = "味噌",
  FrozenUdon = "速冻乌冬",
  ChickenLeg = "鸡腿肉",
  SalmonFillet = "鲑鱼切身",
  CurryBlock = "咖喱块",
  Milk = "牛奶",
  BentoSideDishSet = "便当菜组合",
  Watermelon = "西瓜",
  Apple = "苹果",
  Banana = "香蕉",
  Strawberry = "草莓",
  PorkBelly = "猪五花肉",
  Potato = "土豆",
  Carrot = "胡萝卜",
  Onion = "洋葱",
  Tomato = "番茄",
  GreenPepper = "青椒",
  Mushroom = "蘑菇",
  Bread = "面包",
  Cheese = "奶酪",
  BeefSlices = "牛肉片",
  GroundPork = "猪肉末",
  Bacon = "培根",
  Shrimp = "虾",
  ChickenWings = "鸡翅",
  QuailEggs = "鹌鹑蛋",
  Broccoli = "西兰花",
  Spinach = "菠菜",
  Corn = "玉米",
  Pumpkin = "南瓜",
  Eggplant = "茄子",
  GreenOnion = "大葱",
}

/**
 * 超市食材配置（资源数据）。
 */
export type SupermarketProduct = {
  name: SupermarketProductName;
  price: number;
  description: string;
  metadata: InventoryItemMetadata;
};

/**
 * 超市食材清单（资源数据）。
 *
 * 说明：
 * - 该清单会被用于 LLM 的购买选择，以及购买后写入背包的 item.name；
 * - 食材以 ingredient 类别写入背包，后续由做饭 Action 解释用途。
 */
export const SUPERMARKET_PRODUCTS: SupermarketProduct[] = [
  {
    name: SupermarketProductName.Rice,
    price: 8,
    description: "家里常备的主食，多餐都能用上。",
    metadata: {
      stamina: 3,
      satiety: 22,
      mood: 0,
    },
  },
  {
    name: SupermarketProductName.Egg,
    price: 6,
    description: "便宜又万能的蛋白质，适合早餐和简单料理。",
    metadata: {
      stamina: 5,
      satiety: 12,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Tofu,
    price: 6,
    description: "清淡便宜的豆制品，可以做成温和的一餐。",
    metadata: {
      stamina: 4,
      satiety: 14,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Cabbage,
    price: 8,
    description: "耐放的便宜蔬菜，适合搭配主食和肉类。",
    metadata: {
      stamina: 2,
      satiety: 12,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Miso,
    price: 8,
    description: "可以用来做味噌汤，也能给简单饭菜增加风味。",
    metadata: {
      stamina: 1,
      satiety: 8,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.FrozenUdon,
    price: 12,
    description: "方便快速做一餐的冷冻乌冬。",
    metadata: {
      stamina: 5,
      satiety: 28,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.ChickenLeg,
    price: 18,
    description: "普通肉类食材，适合做一顿更扎实的家常饭。",
    metadata: {
      stamina: 8,
      satiety: 18,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.SalmonFillet,
    price: 24,
    description: "稍微好一点的鱼类食材，适合认真做晚餐。",
    metadata: {
      stamina: 7,
      satiety: 18,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.CurryBlock,
    price: 10,
    description: "咖喱调味块，可以让简单食材变成更有满足感的一餐。",
    metadata: {
      stamina: 2,
      satiety: 10,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Milk,
    price: 10,
    description: "早餐、饮品或料理都能用到的牛奶。",
    metadata: {
      stamina: 3,
      satiety: 10,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.BentoSideDishSet,
    price: 22,
    description: "搭配好的便当菜组合，适合省心准备一餐。",
    metadata: {
      stamina: 8,
      satiety: 34,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.Watermelon,
    price: 18,
    description: "清甜多汁的夏日水果，适合在炎热天气补充水分。",
    metadata: {
      stamina: 3,
      satiety: 16,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.Apple,
    price: 6,
    description: "方便携带的常见水果，适合作为日常点心。",
    metadata: {
      stamina: 2,
      satiety: 10,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Banana,
    price: 5,
    description: "软糯方便的水果，适合快速补充一点体力。",
    metadata: {
      stamina: 4,
      satiety: 12,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Strawberry,
    price: 16,
    description: "酸甜可口的时令水果，能让人心情变好。",
    metadata: {
      stamina: 2,
      satiety: 10,
      mood: 4,
    },
  },
  {
    name: SupermarketProductName.PorkBelly,
    price: 20,
    description: "油脂丰富的猪肉，适合炒菜或炖煮一顿家常饭。",
    metadata: {
      stamina: 9,
      satiety: 20,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Potato,
    price: 6,
    description: "耐放又有饱腹感的根茎食材，做法很多。",
    metadata: {
      stamina: 3,
      satiety: 16,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Carrot,
    price: 6,
    description: "清甜的家常蔬菜，适合和肉类一起炖煮。",
    metadata: {
      stamina: 2,
      satiety: 10,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Onion,
    price: 6,
    description: "炒香后能让家常料理更有风味的基础食材。",
    metadata: {
      stamina: 2,
      satiety: 8,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Tomato,
    price: 8,
    description: "酸甜多汁的蔬菜，适合做汤、炒蛋或凉拌。",
    metadata: {
      stamina: 2,
      satiety: 10,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.GreenPepper,
    price: 8,
    description: "带点清脆辣味的蔬菜，能给炒菜增添口感。",
    metadata: {
      stamina: 2,
      satiety: 8,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Mushroom,
    price: 10,
    description: "鲜味十足的菌菇，适合搭配肉类和面食。",
    metadata: {
      stamina: 3,
      satiety: 10,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Bread,
    price: 8,
    description: "方便快速解决一餐的主食，也能做成简单三明治。",
    metadata: {
      stamina: 4,
      satiety: 20,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Cheese,
    price: 14,
    description: "浓郁的乳制品，能让料理更有满足感。",
    metadata: {
      stamina: 4,
      satiety: 12,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.BeefSlices,
    price: 26,
    description: "适合快炒或火锅的牛肉片，能做出一顿扎实的料理。",
    metadata: {
      stamina: 10,
      satiety: 20,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.GroundPork,
    price: 16,
    description: "方便调味烹饪的猪肉末，适合做肉酱或家常炒菜。",
    metadata: {
      stamina: 8,
      satiety: 18,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Bacon,
    price: 16,
    description: "咸香的培根，搭配早餐或炒菜都很方便。",
    metadata: {
      stamina: 7,
      satiety: 16,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.Shrimp,
    price: 24,
    description: "鲜甜的虾，适合做成稍微讲究一点的料理。",
    metadata: {
      stamina: 8,
      satiety: 16,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.ChickenWings,
    price: 18,
    description: "适合煎烤或炖煮的鸡翅，做出来很有满足感。",
    metadata: {
      stamina: 8,
      satiety: 18,
      mood: 3,
    },
  },
  {
    name: SupermarketProductName.QuailEggs,
    price: 8,
    description: "小巧的鹌鹑蛋，适合加入便当或炖菜。",
    metadata: {
      stamina: 4,
      satiety: 10,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Broccoli,
    price: 10,
    description: "清爽耐搭配的绿色蔬菜，适合快炒或焯水。",
    metadata: {
      stamina: 3,
      satiety: 12,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Spinach,
    price: 8,
    description: "柔嫩的叶菜，适合做汤或简单清炒。",
    metadata: {
      stamina: 2,
      satiety: 10,
      mood: 1,
    },
  },
  {
    name: SupermarketProductName.Corn,
    price: 8,
    description: "带有自然甜味的玉米，可以增加料理的饱腹感。",
    metadata: {
      stamina: 3,
      satiety: 14,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Pumpkin,
    price: 10,
    description: "软糯香甜的南瓜，适合炖煮或做成浓汤。",
    metadata: {
      stamina: 3,
      satiety: 16,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.Eggplant,
    price: 8,
    description: "吸收酱汁后风味浓郁的茄子，适合家常烧制。",
    metadata: {
      stamina: 2,
      satiety: 12,
      mood: 2,
    },
  },
  {
    name: SupermarketProductName.GreenOnion,
    price: 6,
    description: "常用的提香配菜，能让汤面和炒菜更有香气。",
    metadata: {
      stamina: 1,
      satiety: 6,
      mood: 1,
    },
  },
];
