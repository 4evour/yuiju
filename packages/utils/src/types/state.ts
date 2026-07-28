import type { Dayjs } from "dayjs";
import type { ActionId, ActionProactiveShareIntent } from "./action";
import type { WeatherSnapshot } from "./weather";

// 大场景
export enum MajorScene {
  Home = "家",
  School = "星见丘高校",
  BusinessDistrict = "商业区",
  ParkArea = "公园周边",
  CoastArea = "海岸",
}

// 世界具体小场景
export enum WorldSubScene {
  House = "屋内",
  School = "校园",
  Shop = "小町商店",
  Supermarket = "超市",
  Diner = "日和食堂",
  Cafe = "薄暮咖啡",
  TrainStation = "羽浦町站",
  Park = "南风公园",
  Pond = "水音池",
  Shrine = "结灯神社",
  Coast = "月汐海岸",
}

// 家的小场景
export enum HomeSubScene {
  House = WorldSubScene.House,
}

// 星见丘高校的小场景
export enum SchoolSubScene {
  Campus = WorldSubScene.School,
}

// 商业区的小场景
export enum BusinessDistrictSubScene {
  Shop = WorldSubScene.Shop,
  Supermarket = WorldSubScene.Supermarket,
  Diner = WorldSubScene.Diner,
  Cafe = WorldSubScene.Cafe,
  TrainStation = WorldSubScene.TrainStation,
}

// 公园周边的小场景
export enum ParkAreaSubScene {
  Park = WorldSubScene.Park,
  Pond = WorldSubScene.Pond,
  Shrine = WorldSubScene.Shrine,
}

// 海岸的小场景
export enum CoastAreaSubScene {
  Beach = WorldSubScene.Coast,
}

// 位置类型（判别联合）
export type Location =
  | { major: MajorScene.Home; minor: HomeSubScene }
  | { major: MajorScene.School; minor: SchoolSubScene }
  | { major: MajorScene.BusinessDistrict; minor: BusinessDistrictSubScene }
  | { major: MajorScene.ParkArea; minor: ParkAreaSubScene }
  | { major: MajorScene.CoastArea; minor: CoastAreaSubScene };

export type InventoryItemMetadata = {
  /** 售卖价格 */
  salePrice?: number;
  /** 体力恢复值，直接食用和作为食材时共用同一数值 */
  stamina?: number;
  /** 饱腹度恢复值，直接食用和作为食材时共用同一数值 */
  satiety?: number;
  /** 基础心情恢复值，直接食用和作为食材时共用同一数值 */
  mood?: number;
};

export enum InventoryItemCategory {
  Food = "food",
  Ingredient = "ingredient",
  Valuable = "valuable",
}

/**
 * 物品接口
 */
export type InventoryItem = {
  /** 物品名称 */
  name: string;
  /** 物品描述 */
  description: string;
  /** 物品类别 */
  categories: InventoryItemCategory[];
  /** 数量 */
  quantity: number;
  /** 物品元数据 */
  metadata: InventoryItemMetadata;
};

/**
 * 运行中的 action 等待上下文。
 *
 * 说明：
 * - `actionStartedAt` 表示本次 action 开始执行的时间；
 * - `waitUntil` 表示本次等待逻辑应结束的绝对时间，用于进程重启后恢复剩余等待时长；
 * - `behaviorEpisodeId` 指向开始阶段写入的 running 行为 Episode；
 * - `startContext` 保存完成结算必须使用的开始上下文。
 */
export interface RunningActionState {
  /** 当前正在经历等待阶段的 action */
  action: ActionId;
  /** action 开始执行时间 */
  actionStartedAt: string;
  /** 等待逻辑的目标结束时间 */
  waitUntil: string;
  /** 开始阶段写入的 behavior Episode id */
  behaviorEpisodeId: string;
  /** 完成结算需要读取的开始上下文 */
  startContext?: Record<string, any>;
  /** Action 决策阶段产生的主动分享意图 */
  proactiveShareIntent?: ActionProactiveShareIntent;
}

export interface CharacterStateData {
  action: ActionId;
  location: Location;
  /**体力值 */
  stamina: number;
  /** 饱腹度 */
  satiety: number;
  /** 心情 */
  mood: number;
  /** 金钱 */
  money: number;
  /** 手机电量百分比 */
  phoneBattery: number;
  /** 今日已执行的动作列表 */
  dailyActionsDoneToday: ActionId[];
  /** 背包物品列表 */
  inventory?: InventoryItem[];
  /** 运行中的 action 等待上下文 */
  runningAction: RunningActionState | null;
}

export interface WorldSceneResourceState {
  name: string;
  amount: number;
  lastRefreshedAt: string | null;
}

export interface WorldSceneState {
  /**
   * 场景开放状态。没有该字段代表永久开放。
   */
  isOpen?: boolean;
  changedAt?: string | null;
  resources?: WorldSceneResourceState[];
}

export interface WorldStateData {
  time: Dayjs;
  lastAdvancedAt: string;
  weather: WeatherSnapshot | null;
  scenes: Record<WorldSubScene, WorldSceneState>;
}
