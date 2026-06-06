import { tool } from "ai";
import { z } from "zod";
import {
  CAFE_COFFEES,
  DINER_MEALS,
  SHOP_PRODUCTS,
  SUPERMARKET_PRODUCTS,
} from "../../constants/world";
import {
  type WorldGuideTopic,
  worldGuideCoastIntroduction,
  worldGuidePlaceIntroductions,
  worldGuideShrineIntroduction,
  worldGuideTopics,
  worldGuideTrainStationIntroduction,
} from "../../prompt/world-guide";
import { getWorldMapMajorPlaceId, worldMapDsl } from "../../prompt/world-map";
import { initCharacterStateData } from "../../redis";

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
  placeIntroductions: () => ({
    topic: "placeIntroductions",
    title: "星见町地点简介",
    places: worldGuidePlaceIntroductions,
  }),
  coastGuide: () => ({
    topic: "coastGuide",
    title: "月汐海岸详细介绍",
    introduction: worldGuideCoastIntroduction,
  }),
  trainStationGuide: () => ({
    topic: "trainStationGuide",
    title: "星见町站详细介绍",
    introduction: worldGuideTrainStationIntroduction,
  }),
  shrineGuide: () => ({
    topic: "shrineGuide",
    title: "结灯神社详细介绍",
    introduction: worldGuideShrineIntroduction,
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
- placeIntroductions：星见町所有主要地点的简要介绍与可执行 Action
- coastGuide：月汐海岸的详细景观介绍与季节特征
- trainStationGuide：星见町站与运行列车的详细介绍
- shrineGuide：结灯神社的详细介绍与可俯瞰的小镇风景
`),
  }),
  execute: async ({ topics }) => {
    const results = await Promise.all(topics.map((topic) => staticGuideResultByTopic[topic]()));

    return {
      results,
    };
  },
});
