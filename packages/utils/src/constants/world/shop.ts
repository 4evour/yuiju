/**
 * 商店可购买商品名称枚举。
 *
 * 说明：
 * - 枚举值使用“展示用中文名”，确保落到背包 item.name 的字符串稳定一致。
 * - 使用 enum 目的是让 world/web/message 等跨包代码对“可用名称集合”有强类型约束。
 */
export enum ShopProductName {
  Pocky = "百奇",
  SoftCandy = "纯软糖",
  RamuneCandy = "弹珠汽水糖",
  MatchaPudding = "抹茶布丁",
  Ramune = "波子汽水",
  Dorayaki = "铜锣烧",
  Senbei = "盐味仙贝",
  StrawberryMilk = "草莓牛奶",
  RedBeanBread = "红豆面包",
  HoneyLemonCandy = "蜂蜜柠檬糖",
  OolongTea = "乌龙茶",
}

/**
 * 商店商品配置（资源数据）。
 *
 * 说明：
 * - stamina/satiety/mood 为“食用/使用时”的收益值（由 world 的行为执行器解释）；
 * - name 必须来自 ShopProductName，避免出现拼写不一致导致库存匹配失败。
 */
export type ShopProduct = {
  name: ShopProductName;
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
 * 商店商品清单（资源数据）。
 *
 * 说明：
 * - 该清单会被用于 LLM 的购买选择，以及购买后写入背包的 item.name；
 * - 修改这里会影响行为数值与测试断言，请同步更新相关单测。
 */
export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    name: ShopProductName.Pocky,
    price: 12,
    satiety: 5,
    mood: 2,
    description: "涂层饼干棒，草莓口味。",
  },
  {
    name: ShopProductName.SoftCandy,
    price: 12,
    satiety: 5,
    mood: 2,
    description: "高果汁含量的软糖，芒果口味。",
  },
  {
    name: ShopProductName.RamuneCandy,
    price: 8,
    satiety: 3,
    mood: 1,
    description: "汽水风味的硬糖，含气泡口感。",
  },
  {
    name: ShopProductName.MatchaPudding,
    price: 15,
    satiety: 5,
    mood: 2,
    description: "带有抹茶的清香微苦，口感细腻。",
  },
  {
    name: ShopProductName.Ramune,
    price: 10,
    stamina: 2,
    satiety: 2,
    mood: 4,
    description: "玻璃瓶装的清爽汽水，弹珠碰撞瓶口时会发出轻响。",
  },
  {
    name: ShopProductName.Dorayaki,
    price: 12,
    satiety: 6,
    mood: 2,
    description: "松软的蜂蜜饼皮夹着红豆馅。",
  },
  {
    name: ShopProductName.Senbei,
    price: 9,
    satiety: 4,
    mood: 1,
    description: "烤得酥脆的盐味米饼。",
  },
  {
    name: ShopProductName.StrawberryMilk,
    price: 11,
    stamina: 1,
    satiety: 3,
    mood: 3,
    description: "纸盒装草莓牛奶，甜味柔和。",
  },
  {
    name: ShopProductName.RedBeanBread,
    price: 13,
    satiety: 6,
    mood: 2,
    description: "圆面包里填着绵密红豆馅。",
  },
  {
    name: ShopProductName.HoneyLemonCandy,
    price: 8,
    stamina: 1,
    satiety: 2,
    mood: 2,
    description: "蜂蜜柠檬味硬糖，酸甜清爽。",
  },
  {
    name: ShopProductName.OolongTea,
    price: 7,
    stamina: 2,
    mood: 1,
    description: "瓶装乌龙茶，茶香干净清淡。",
  },
];
