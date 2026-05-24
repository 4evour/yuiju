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
}

/**
 * 超市食材配置（资源数据）。
 */
export type SupermarketProduct = {
  name: SupermarketProductName;
  price: number;
  description: string;
};

/**
 * 超市食材清单（资源数据）。
 *
 * 说明：
 * - 该清单会被用于 LLM 的购买选择，以及购买后写入背包的 item.name；
 * - 食材以 material 类别写入背包，后续由做饭 Action 解释用途。
 */
export const SUPERMARKET_PRODUCTS: SupermarketProduct[] = [
  {
    name: SupermarketProductName.Rice,
    price: 8,
    description: "家里常备的主食，多餐都能用上。",
  },
  {
    name: SupermarketProductName.Egg,
    price: 6,
    description: "便宜又万能的蛋白质，适合早餐和简单料理。",
  },
  {
    name: SupermarketProductName.Tofu,
    price: 6,
    description: "清淡便宜的豆制品，可以做成温和的一餐。",
  },
  {
    name: SupermarketProductName.Cabbage,
    price: 8,
    description: "耐放的便宜蔬菜，适合搭配主食和肉类。",
  },
  {
    name: SupermarketProductName.Miso,
    price: 8,
    description: "可以用来做味噌汤，也能给简单饭菜增加风味。",
  },
  {
    name: SupermarketProductName.FrozenUdon,
    price: 12,
    description: "方便快速做一餐的冷冻乌冬。",
  },
  {
    name: SupermarketProductName.ChickenLeg,
    price: 18,
    description: "普通肉类食材，适合做一顿更扎实的家常饭。",
  },
  {
    name: SupermarketProductName.SalmonFillet,
    price: 24,
    description: "稍微好一点的鱼类食材，适合认真做晚餐。",
  },
  {
    name: SupermarketProductName.CurryBlock,
    price: 10,
    description: "咖喱调味块，可以让简单食材变成更有满足感的一餐。",
  },
  {
    name: SupermarketProductName.Milk,
    price: 10,
    description: "早餐、饮品或料理都能用到的牛奶。",
  },
  {
    name: SupermarketProductName.BentoSideDishSet,
    price: 22,
    description: "搭配好的便当菜组合，适合省心准备一餐。",
  },
];
