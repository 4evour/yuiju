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
  "coastGuide",
  "trainStationGuide",
  "shrineGuide",
] as const;

export type WorldGuideTopic = (typeof worldGuideTopics)[number];

export const worldGuideCoastIntroduction = `
月汐海岸是一片将“巍峨群山”与“深邃海洋”融合在一起的奇迹海岸。沿岸沙滩绵延，近海处静卧着一座名为“幻月岩”的孤立礁石，几株饱经海风洗礼的古松扎根其上，成为海浪起伏之间最醒目的视觉焦点。

隔着波光粼粼的幽蓝海湾，巍峨连绵的圣山在海的彼端清晰耸立。大部分时节里，青灰色的险峻山脊与湛蓝海面彼此映照，群峰时常掩映在翻涌云雾之中，第一次来到这里的人，往往都会被那种近乎神圣的辽阔感震住。

圣山连峰并非全年覆雪。只有在冬季至初春，也就是 11 月到次年 3 月之间，群山才会披上纯白冬装。那时空气能见度最高，白雪覆盖的山脊与冰冷浪花会组成大陆上少见的“海山共振”绝景。尤其是晴朗清晨，阳光会把银白色的雪山山头染成一层金粉色，是最适合远望和拍照的时刻。

沿着潮线慢慢散步时，常能捡到被海浪留下的星砂贝壳和海玻璃，运气特别好的时候，甚至还能遇到月汐珍珠。
`.trim();

export const worldGuideTrainStationIntroduction = `
星见町站是商业区边缘的一座小电车站，也是前往月汐海岸的出发点。站台旁只有一条蜿蜒在陆地边缘的单线非电气化铁道，周围没有大城市车站那种密集与喧闹，更多是海风、铁轨和列车靠站前短暂聚起的人声。

这里运行的是 KiHa 40 形单节编组列车。车身通体是饱经风霜的复古朱红色，外形方正厚重，没有现代列车常见的流线感，反而带着很强的旧时代工业气质。车顶装着粗犷的空调外机与排气管，车头正上方是一盏醒目的单孔探照大灯，靠近时能清楚看到窗框边缘残留的金属氧化痕迹。

车厢内部保留着老式下拉车窗、经典绒面相亲座、淡绿色木纹内壁，以及会在列车运行时轻轻晃动的复古电风扇。每当列车启动，车底都会传来沉闷有力的柴油机轰鸣，车身也会跟着微微震动，排气管吐出一缕淡淡尾气。可以从这里乘电车前往月汐海岸，单程车费 3 元。
`.trim();

export const worldGuideShrineIntroduction = `
结灯神社位于南风公园旁那座不高的小山上，要走过一段缓坡和石阶才能到达。它不是那种专门吸引外地游客的大型神社，更像是星见町本地人会在放学后、散步途中，或想让自己安静一下时顺路上去参拜的地方。

神社的境内不大，木制拜殿、鸟居、手水舍和几盏旧石灯安静地分布在山顶一带。天气好的时候，站在神社前的空地边缘，可以直接鸟瞰整个星见町。住宅、小路、商业区的屋顶、公园一带的树影，都会在视线里慢慢铺开，连更远一些的海边方向也能看见一点朦胧的亮色。

到了傍晚，这里尤其有小镇神社独有的日常感。风从山坡上吹过，铃绪和树叶会发出很轻的声音，山下的生活气息却还隐约传得上来，所以它并不会显得与人世隔绝，反而像是镇子里一个稍微抬高一点、可以暂时整理心绪的地方。
`.trim();

export const worldGuidePlaceIntroductions = [
  {
    name: `${MajorScene.Home}-${HomeSubScene.House}`,
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
    availableActions: [
      ActionId.Buy_Item_At_Shop,
      ActionId.Go_Home_From_Shop,
      ActionId.Go_To_School_From_Shop,
      ActionId.Go_To_Supermarket_From_Shop,
      ActionId.Go_To_Train_Station_From_Shop,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Supermarket}`,
    availableActions: [
      ActionId.Buy_Ingredient_At_Supermarket,
      ActionId.Sell_Item_At_Supermarket,
      ActionId.Go_Home_From_Supermarket,
      ActionId.Go_To_School_From_Supermarket,
      ActionId.Go_To_Shop_From_Supermarket,
      ActionId.Go_To_Diner_From_Supermarket,
      ActionId.Go_To_Train_Station_From_Supermarket,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Diner}`,
    availableActions: [
      ActionId.Eat_At_Diner,
      ActionId.Go_Home_From_Diner,
      ActionId.Go_To_School_From_Diner,
      ActionId.Go_To_Supermarket_From_Diner,
      ActionId.Go_To_Cafe_From_Diner,
      ActionId.Go_To_Train_Station_From_Diner,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.Cafe}`,
    availableActions: [
      ActionId.Drink_Coffee,
      ActionId.Work_At_Cafe,
      ActionId.Go_Home_From_Cafe,
      ActionId.Go_To_School_From_Cafe,
      ActionId.Go_To_Diner_From_Cafe,
      ActionId.Go_To_Train_Station_From_Cafe,
    ],
  },
  {
    name: `${MajorScene.BusinessDistrict}-${BusinessDistrictSubScene.TrainStation}`,
    availableActions: [
      ActionId.Go_To_Shop_From_Train_Station,
      ActionId.Go_To_Supermarket_From_Train_Station,
      ActionId.Go_To_Diner_From_Train_Station,
      ActionId.Go_To_Cafe_From_Train_Station,
      ActionId.Take_Train_To_Coast_From_Train_Station,
    ],
  },
  {
    name: `${MajorScene.ParkArea}-${ParkAreaSubScene.Park}`,
    availableActions: [
      ActionId.Walk_In_Park,
      ActionId.Go_Home_From_Park,
      ActionId.Go_To_Shrine_From_Park,
      ActionId.Go_To_Pond_From_Park,
    ],
  },
  {
    name: `${MajorScene.ParkArea}-${ParkAreaSubScene.Pond}`,
    availableActions: [ActionId.Fish_At_Pond, ActionId.Go_To_Park_From_Pond],
  },
  {
    name: `${MajorScene.ParkArea}-${ParkAreaSubScene.Shrine}`,
    availableActions: [
      ActionId.Pray_At_Shrine,
      ActionId.Go_To_Park_From_Shrine,
      ActionId.Go_Home_From_Shrine,
    ],
  },
  {
    name: `${MajorScene.CoastArea}-${CoastAreaSubScene.Beach}`,
    availableActions: [ActionId.Walk_In_Coast, ActionId.Take_Train_To_Train_Station_From_Coast],
  },
];
