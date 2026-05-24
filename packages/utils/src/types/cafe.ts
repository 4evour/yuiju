/**
 * 咖啡店可点单/可消费的咖啡名称枚举。
 *
 * 说明：
 * - 枚举值使用“展示用中文名”，确保落到背包 item.name 的字符串稳定一致。
 * - 使用 enum 目的是让 world/web/message 等跨包代码对“可用名称集合”有强类型约束。
 */
export enum CafeCoffeeName {
  DeepRoastBlend = "深煎拼配",
  LightRoastBlend = "浅煎拼配",
  IceDripCoffee = "冰滴咖啡",
  Americano = "美式",
  MilkCoffee = "牛奶咖啡",
  ViennaCoffee = "维也纳咖啡",
}

/**
 * 咖啡店咖啡配置（资源数据）。
 *
 * 说明：
 * - stamina/satiety/mood 均为“饮用时”的恢复值；
 * - name 必须来自 CafeCoffeeName，避免出现拼写不一致导致库存匹配失败。
 */
export type CafeCoffee = {
  name: CafeCoffeeName;
  price: number;
  description: string;
  /** 体力恢复值 */
  stamina?: number;
  /** 饱腹度恢复值 */
  satiety?: number;
  /** 心情恢复值 */
  mood?: number;
};

/**
 * 咖啡店商品清单（资源数据）。
 *
 * 说明：
 * - 该清单会被用于 LLM 的点单选择，以及背包消费逻辑；
 * - 修改这里会影响行为数值与测试断言，请同步更新相关单测。
 */
export const CAFE_COFFEES: CafeCoffee[] = [
  {
    name: CafeCoffeeName.DeepRoastBlend,
    price: 80,
    stamina: 5,
    satiety: 8,
    description: "深煎豆香扎实，苦韵干净，适合慢慢喝。",
  },
  {
    name: CafeCoffeeName.LightRoastBlend,
    price: 85,
    stamina: 5,
    satiety: 8,
    mood: 2,
    description: "浅煎风味明亮，带一点果香，尾韵轻盈。",
  },
  {
    name: CafeCoffeeName.IceDripCoffee,
    price: 90,
    stamina: 5,
    satiety: 9,
    description: "低温慢萃，口感清透，冰凉里带着回甘。",
  },
  {
    name: CafeCoffeeName.Americano,
    price: 90,
    stamina: 5,
    satiety: 9,
    description: "清爽直接，苦感利落，是最经典的一杯。",
  },
  {
    name: CafeCoffeeName.MilkCoffee,
    price: 100,
    stamina: 5,
    satiety: 10,
    mood: 3,
    description: "热牛奶把咖啡的苦味收得柔和，温暖又顺口。",
  },
  {
    name: CafeCoffeeName.ViennaCoffee,
    price: 120,
    stamina: 5,
    satiety: 11,
    mood: 4,
    description: "浓咖啡顶着柔软鲜奶油，入口香甜，余味还是咖啡香。",
  },
];
