import { ActionId } from "../types/action";
import {
  BusinessDistrictSubScene,
  CoastAreaSubScene,
  HomeSubScene,
  MajorScene,
  ParkAreaSubScene,
  SchoolSubScene,
} from "../types/state";

export const worldGuideTopics = [
  "worldMap",
  "shopProducts",
  "supermarketProducts",
  "dinerMenu",
  "cafeMenu",
  "placeIntroductions",
] as const;

export type WorldGuideTopic = (typeof worldGuideTopics)[number];

export const worldGuidePlaceIntroductions = [
  {
    name: `${MajorScene.Home}-${HomeSubScene.House}`,
    introduction: "独自生活的地方，有带书桌的卧室和挂着两个风铃的小阳台。",
    availableActions: [
      ActionId.Wake_Up,
      ActionId.Sleep_For_A_Little,
      ActionId.Go_To_School_From_Home,
      ActionId.Go_To_Shop_From_Home,
      ActionId.Go_To_Cafe_From_Home,
      ActionId.Go_To_Supermarket_From_Home,
      ActionId.Go_To_Diner_From_Home,
      ActionId.Go_To_Park_From_Home,
      ActionId.Go_To_Shrine_From_Home,
      ActionId.Cook_And_Eat_At_Home,
      ActionId.Stay_At_Home,
      ActionId.Sleep,
    ],
  },
  {
    name: `${MajorScene.School}-${SchoolSubScene.Campus}`,
    introduction: "日式高中学校，上课时间为9点-12点、14点-16点。",
    availableActions: [
      ActionId.Study_At_School,
      ActionId.Go_Home_From_School,
      ActionId.Go_To_Shop_From_School,
      ActionId.Go_To_Cafe_From_School,
      ActionId.Go_To_Supermarket_From_School,
      ActionId.Go_To_Diner_From_School,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Shop}`,
    introduction: "星见町的便利商店/零食铺，可以花金币购买零食。",
    availableActions: [
      ActionId.Buy_Item_At_Shop,
      ActionId.Go_Home_From_Shop,
      ActionId.Go_To_School_From_Shop,
      ActionId.Go_To_Supermarket_From_Shop,
      ActionId.Go_To_Coast_From_Shop,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Supermarket}`,
    introduction: "商业区里的超市，货架上有日常食材和生活用品。",
    availableActions: [
      ActionId.Buy_Ingredient_At_Supermarket,
      ActionId.Go_Home_From_Supermarket,
      ActionId.Go_To_School_From_Supermarket,
      ActionId.Go_To_Shop_From_Supermarket,
      ActionId.Go_To_Diner_From_Supermarket,
      ActionId.Go_To_Coast_From_Supermarket,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Diner}`,
    introduction: "商业区里的日常食堂，提供定食和简餐，是星见町解决日常餐食的地方。",
    availableActions: [
      ActionId.Eat_At_Diner,
      ActionId.Go_Home_From_Diner,
      ActionId.Go_To_School_From_Diner,
      ActionId.Go_To_Supermarket_From_Diner,
      ActionId.Go_To_Cafe_From_Diner,
      ActionId.Go_To_Coast_From_Diner,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Cafe}`,
    introduction: "气氛安静的小咖啡馆，可以兼职打工，也可以在这里购买各种咖啡。",
    availableActions: [
      ActionId.Drink_Coffee,
      ActionId.Work_At_Cafe,
      ActionId.Go_Home_From_Cafe,
      ActionId.Go_To_School_From_Cafe,
      ActionId.Go_To_Diner_From_Cafe,
      ActionId.Go_To_Coast_From_Cafe,
    ],
  },
  {
    name: `${MajorScene.ParkArea}-${ParkAreaSubScene.Park}`,
    introduction: "适合散步放松的公园，可以让心情慢慢恢复。",
    availableActions: [
      ActionId.Walk_In_Park,
      ActionId.Go_Home_From_Park,
      ActionId.Go_To_Shrine_From_Park,
      ActionId.Go_To_Pond_From_Park,
    ],
  },
  {
    name: `${MajorScene.ParkArea}-${ParkAreaSubScene.Pond}`,
    introduction: "南风公园附近安静的小池，可以在水边钓鱼。",
    availableActions: [ActionId.Fish_At_Pond, ActionId.Go_To_Park_From_Pond],
  },
  {
    name: `${MajorScene.ParkArea}-${ParkAreaSubScene.Shrine}`,
    introduction: "供奉神明的地方，可以参拜，适合在安静的氛围里整理心绪。",
    availableActions: [
      ActionId.Pray_At_Shrine,
      ActionId.Go_To_Park_From_Shrine,
      ActionId.Go_Home_From_Shrine,
    ],
  },
  {
    name: `${MajorScene.CoastArea}-${CoastAreaSubScene.Beach}`,
    introduction: "位于小町商店东边的海岸步道，路程较远，适合散步放松。",
    availableActions: [
      ActionId.Walk_In_Coast,
      ActionId.Go_To_Shop_From_Coast,
      ActionId.Go_To_Cafe_From_Coast,
      ActionId.Go_To_Supermarket_From_Coast,
      ActionId.Go_To_Diner_From_Coast,
    ],
  },
];
