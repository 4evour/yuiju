import { tool } from "ai";
import { z } from "zod";
import {
  shrineIntroduction,
  type WorldGuideTopic,
  worldGuidePlaceIntroductions,
  worldGuideTopics,
} from "../../prompt/world-guide";
import { getWorldMapMajorPlaceId, worldMapDsl } from "../../prompt/world-map";
import { initCharacterStateData } from "../../redis";
import { CAFE_COFFEES } from "../../types/cafe";
import { DINER_MEALS } from "../../types/diner";
import { SHOP_PRODUCTS } from "../../types/shop";
import { SUPERMARKET_PRODUCTS } from "../../types/supermarket";

const staticGuideResultByTopic = {
  worldMap: async () => {
    const characterState = await initCharacterStateData();
    const major = getWorldMapMajorPlaceId(characterState.location.major);

    return {
      topic: "worldMap",
      title: "星见町世界地图",
      dsl: worldMapDsl(major),
    };
  },
  shopProducts: () => ({
    topic: "shopProducts",
    title: "小町商店售卖商品",
    products: SHOP_PRODUCTS,
  }),
  supermarketProducts: () => ({
    topic: "supermarketProducts",
    title: "超市售卖食材",
    products: SUPERMARKET_PRODUCTS,
  }),
  dinerMenu: () => ({
    topic: "dinerMenu",
    title: "日和食堂菜单",
    meals: DINER_MEALS,
  }),
  cafeMenu: () => ({
    topic: "cafeMenu",
    title: "薄暮咖啡菜单",
    coffees: CAFE_COFFEES,
  }),
  shrineIntroduction: () => ({
    topic: "shrineIntroduction",
    title: "结灯神社介绍",
    shrine: shrineIntroduction,
  }),
  placeIntroductions: () => ({
    topic: "placeIntroductions",
    title: "星见町地点介绍",
    places: worldGuidePlaceIntroductions,
  }),
} satisfies Record<WorldGuideTopic, () => unknown | Promise<unknown>>;

export const queryStaticGuideTool = tool({
  description: "查询静态资料条目",
  inputSchema: z.object({
    topics: z
      .array(z.enum(worldGuideTopics))
      .min(1)
      .describe(`
- worldMap：星见町世界地图 DSL，包括地点关系、路径、方向与移动耗时
- shopProducts：小町商店售卖的商品、价格、描述与食用效果
- supermarketProducts：超市售卖的食材、价格与描述
- dinerMenu：日和食堂可点餐品、价格、描述与店内就餐恢复效果
- cafeMenu：薄暮咖啡可点的咖啡、价格、描述与饮用效果
- shrineIntroduction：结灯神社的地点介绍、氛围、用途与可进行的事情
- placeIntroductions：星见町所有主要地点的简要介绍与可进行的事情
`),
  }),
  execute: async ({ topics }) => {
    const results = await Promise.all(topics.map((topic) => staticGuideResultByTopic[topic]()));

    return {
      results,
    };
  },
});
