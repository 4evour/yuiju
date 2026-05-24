/**
 * 日和食堂可点餐品名称枚举。
 *
 * 说明：
 * - 枚举值使用“展示用中文名”，确保店内就餐事件描述稳定一致。
 * - 日和食堂是店内就餐，不写入背包。
 */
export enum DinerMealName {
  Udon = "乌冬面",
  TamagoyakiSet = "玉子烧定食",
  CurryRice = "咖喱饭",
  Oyakodon = "亲子丼",
  KaraageSet = "唐扬鸡块定食",
  GrilledSalmonSet = "鲑鱼盐烤定食",
  DailySet = "今日定食",
}

/**
 * 日和食堂餐品配置（资源数据）。
 */
export type DinerMeal = {
  name: DinerMealName;
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
 * 日和食堂菜单（资源数据）。
 *
 * 说明：
 * - 店内就餐直接恢复状态，不写入背包；
 * - 价格以“打工 1 小时 200 金币”为锚点，保持低生存压力。
 */
export const DINER_MEALS: DinerMeal[] = [
  {
    name: DinerMealName.Udon,
    price: 18,
    stamina: 6,
    satiety: 35,
    mood: 2,
    description: "热乎乎的乌冬面，便宜、温和，适合轻松补一餐。",
  },
  {
    name: DinerMealName.TamagoyakiSet,
    price: 22,
    stamina: 8,
    satiety: 38,
    mood: 3,
    description: "玉子烧配米饭和味噌汤，简单但安心的定食。",
  },
  {
    name: DinerMealName.CurryRice,
    price: 26,
    stamina: 10,
    satiety: 48,
    mood: 3,
    description: "浓郁的日式咖喱饭，能让饱腹感稳定恢复。",
  },
  {
    name: DinerMealName.Oyakodon,
    price: 28,
    stamina: 12,
    satiety: 50,
    mood: 4,
    description: "鸡肉和鸡蛋盖在米饭上，热乎又有满足感。",
  },
  {
    name: DinerMealName.KaraageSet,
    price: 32,
    stamina: 12,
    satiety: 52,
    mood: 4,
    description: "唐扬鸡块配米饭和小菜，适合需要好好吃一顿的时候。",
  },
  {
    name: DinerMealName.GrilledSalmonSet,
    price: 35,
    stamina: 10,
    satiety: 50,
    mood: 5,
    description: "鲑鱼盐烤定食，清爽但认真，是稍微丰盛一点的日常饭。",
  },
  {
    name: DinerMealName.DailySet,
    price: 35,
    stamina: 12,
    satiety: 56,
    mood: 5,
    description: "当天推荐的完整定食，适合想省心吃饱的时候。",
  },
];
