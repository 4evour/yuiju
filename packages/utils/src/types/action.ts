import type { AgentPlanChange } from "./plan";
import type { CharacterStateData, ICharacterState, IWorldState, RunningActionState } from "./state";

export enum ActionId {
  /** 起床 */
  Wake_Up = "起床",
  /** 再睡一会 */
  Sleep_For_A_Little = "再睡一会",
  /** 去学校 */
  Go_To_School_From_Home = "从家去学校",
  /** 待在家里 */
  Stay_At_Home = "待在家里",
  /** 在家做饭吃 */
  Cook_And_Eat_At_Home = "在家做饭吃",
  /** 睡觉 */
  Sleep = "睡觉",

  /** 在学校学习 */
  Study_At_School = "在学校学习",
  /** 放学回家 */
  Go_Home_From_School = "放学回家",

  /** 空闲/发呆 */
  Idle = "发呆",

  /** 吃指定食物 */
  Eat_Item = "吃东西",
  /** 在家前往商店 */
  Go_To_Shop_From_Home = "从家去商店",
  /** 在学校前往商店 */
  Go_To_Shop_From_School = "从学校去商店",
  /** 在家前往超市 */
  Go_To_Supermarket_From_Home = "从家去超市",
  /** 在学校前往超市 */
  Go_To_Supermarket_From_School = "从学校去超市",
  /** 在家前往日和食堂 */
  Go_To_Diner_From_Home = "从家去日和食堂",
  /** 在学校前往日和食堂 */
  Go_To_Diner_From_School = "从学校去日和食堂",
  /** 从商店回家 */
  Go_Home_From_Shop = "从商店回家",
  /** 从商店去学校 */
  Go_To_School_From_Shop = "从商店去学校",
  /** 从商店去超市 */
  Go_To_Supermarket_From_Shop = "从商店去超市",

  /** 在商店购买物品 */
  Buy_Item_At_Shop = "在商店购买物品",

  /** 从家去咖啡店 */
  Go_To_Cafe_From_Home = "从家去咖啡店",
  /** 从学校去咖啡店 */
  Go_To_Cafe_From_School = "从学校去咖啡店",
  /** 从咖啡店回家 */
  Go_Home_From_Cafe = "从咖啡店回家",
  /** 从咖啡店去学校 */
  Go_To_School_From_Cafe = "从咖啡店去学校",
  /** 从咖啡店去日和食堂 */
  Go_To_Diner_From_Cafe = "从咖啡店去日和食堂",
  /** 从咖啡店去月汐海岸 */
  Go_To_Coast_From_Cafe = "从咖啡店去月汐海岸",

  /** 喝咖啡 */
  Drink_Coffee = "喝咖啡",
  /** 打工 */
  Work_At_Cafe = "打工",

  /** 在超市购买食材 */
  Buy_Ingredient_At_Supermarket = "在超市购买食材",
  /** 在超市售卖物品 */
  Sell_Item_At_Supermarket = "在超市售卖物品",
  /** 在日和食堂店内就餐 */
  Eat_At_Diner = "在日和食堂就餐",

  /** 从家去公园 */
  Go_To_Park_From_Home = "从家去公园",
  /** 从公园回家 */
  Go_Home_From_Park = "从公园回家",
  /** 在公园散步 */
  Walk_In_Park = "在公园散步",

  /** 从公园去神社 */
  Go_To_Shrine_From_Park = "从公园去神社",
  /** 从公园去水音池 */
  Go_To_Pond_From_Park = "从公园去水音池",
  /** 从家去神社 */
  Go_To_Shrine_From_Home = "从家去神社",
  /** 在神社参拜 */
  Pray_At_Shrine = "参拜",
  /** 从神社回公园 */
  Go_To_Park_From_Shrine = "从神社回公园",
  /** 从神社回家 */
  Go_Home_From_Shrine = "从神社回家",
  /** 从水音池回公园 */
  Go_To_Park_From_Pond = "从水音池回公园",
  /** 在水音池钓鱼 */
  Fish_At_Pond = "钓鱼",

  /** 从商店去月汐海岸 */
  Go_To_Coast_From_Shop = "从商店去月汐海岸",
  /** 从超市回家 */
  Go_Home_From_Supermarket = "从超市回家",
  /** 从超市去学校 */
  Go_To_School_From_Supermarket = "从超市去学校",
  /** 从超市去商店 */
  Go_To_Shop_From_Supermarket = "从超市去商店",
  /** 从超市去日和食堂 */
  Go_To_Diner_From_Supermarket = "从超市去日和食堂",
  /** 从超市去月汐海岸 */
  Go_To_Coast_From_Supermarket = "从超市去月汐海岸",
  /** 从日和食堂回家 */
  Go_Home_From_Diner = "从日和食堂回家",
  /** 从日和食堂去学校 */
  Go_To_School_From_Diner = "从日和食堂去学校",
  /** 从日和食堂去超市 */
  Go_To_Supermarket_From_Diner = "从日和食堂去超市",
  /** 从日和食堂去咖啡店 */
  Go_To_Cafe_From_Diner = "从日和食堂去咖啡店",
  /** 从日和食堂去月汐海岸 */
  Go_To_Coast_From_Diner = "从日和食堂去月汐海岸",
  /** 从月汐海岸回商店 */
  Go_To_Shop_From_Coast = "从月汐海岸去商店",
  /** 从月汐海岸回超市 */
  Go_To_Supermarket_From_Coast = "从月汐海岸去超市",
  /** 从月汐海岸回日和食堂 */
  Go_To_Diner_From_Coast = "从月汐海岸去日和食堂",
  /** 从月汐海岸回咖啡店 */
  Go_To_Cafe_From_Coast = "从月汐海岸去咖啡店",
  /** 在月汐海岸散步 */
  Walk_In_Coast = "在月汐海岸散步",
}

export interface ActionContext {
  characterState: ICharacterState;
  characterStateData: CharacterStateData;
  worldState: IWorldState;
  eventDescription?: string;
}

/**
 * 通用候选项结构。
 *
 * 用途：
 * - 作为“吃什么 / 买什么 / 点什么”等选择器的候选项输入；
 * - 与 Action 执行链路解耦，避免复用过时的 action 参数模型。
 */
export interface ChoiceOption {
  /** 候选项唯一值，如："苹果" */
  value: string;
  /** 候选项描述，如："苹果可以恢复10点体力" */
  description?: string;
  /** 额外信息，如：{ price: 5, stamina: 20 } */
  extra?: Record<string, any>;
}

export interface ActionAgentDecision {
  action: ActionId;
  reason: string;
  durationMinute?: number;
  planChanges?: AgentPlanChange[];
  proactiveShareIntent?: ActionProactiveShareIntent;
}

export interface ActionProactiveShareIntent {
  shouldShare: boolean;
  reason: string;
}

export interface ActionProactiveShareConfig {
  enabled: boolean;
}

export type ActionStartResult = void | {
  executionResult?: string;
  startContext?: Record<string, unknown>;
};

export type ActionCompletionEventResult = void | {
  completionContext?: Record<string, unknown>;
  eventDescription?: string;
};

/**
 * 原子行为配置
 */
export abstract class ActionMetadata {
  abstract action: ActionId;
  /** action 描述 */
  abstract description: string;
  /** 是否允许该 Action 在决策时产生主动分享意图 */
  proactiveShare?: ActionProactiveShareConfig;
  /** 前置条件 */
  abstract precondition: (context: ActionContext) => boolean | Promise<boolean>;

  /** 执行器，接收本次 Action 决策结果，返回执行结果 */
  abstract executor: (
    context: ActionContext,
    selectedAction: ActionAgentDecision,
  ) => Promise<ActionStartResult>;

  /** 行动耗时 min，支持基于本次决策结果做动态计算 */
  abstract durationMin:
    | number
    | ((context: ActionContext, selectedAction?: ActionAgentDecision) => Promise<number>);

  /**
   * Action 结束时产生的事件描述。
   * 该描述将作为事件 context 输入给下一次 tick 的 LLM，用于说明上一个动作结束时的状态或发生的事件。
   * 示例："闹钟响了，该起床了" 或 (ctx) => `你结束了${ctx.action}，感觉焕然一新`
   */
  abstract completionEvent?: (
    context: ActionContext,
    runningAction: RunningActionState,
  ) => ActionCompletionEventResult | Promise<ActionCompletionEventResult>;
}

export interface BehaviorRecord {
  behavior: ActionId; // 改为 behavior，与数据库字段一致
  description: string; // 改为 description
  timestamp: number;
}
