import { type ActionContext, ActionId } from "@yuiju/utils";
import { anywhereAction } from "./anywhere";
import { businessDistrictAction } from "./business-district";
import { coastAction } from "./coast-area";
import { homeAction } from "./home";
import { parkAreaAction } from "./park-area";
import { schoolAction } from "./school";

export const PrecheckActionMap: Record<string, ActionId[]> = {
  [ActionId.Sleep]: [ActionId.Wake_Up, ActionId.Sleep_For_A_Little],
};

export function precheckAction(context: ActionContext) {
  const currentAction = context.characterStateData.action;
  const actionList = PrecheckActionMap[currentAction];
  if (actionList) {
    return actionList.map(getActionById);
  }
}

export const isDoing = (context: ActionContext, action: ActionId) =>
  context.characterStateData.action === action;

export const isNotDoing = (context: ActionContext, action: ActionId) =>
  context.characterStateData.action !== action;

export const getActionById = (action: ActionId) => {
  return [
    ...anywhereAction,
    ...homeAction,
    ...schoolAction,
    ...businessDistrictAction,
    ...coastAction,
    ...parkAreaAction,
  ].find((item) => item.action === action)!;
};

/** 上午 */
export const isMorning = (context: ActionContext) => {
  const hour = context.worldState.time.get("hour");
  return hour >= 6 && hour < 12;
};

/** 下午 */
export const isAfternoon = (context: ActionContext) => {
  const hour = context.worldState.time.get("hour");
  return hour >= 12 && hour < 18;
};

/** 晚上 */
export const isEvening = (context: ActionContext) => {
  const hour = context.worldState.time.get("hour");
  return hour >= 18 && hour < 22;
};

/** 夜间 */
export const isNight = (context: ActionContext) => {
  const hour = context.worldState.time.get("hour");
  return hour >= 22 || hour < 6;
};

export const isWeekend = (context: ActionContext) => {
  const weekday = context.worldState.time.day();
  return weekday === 0 || weekday === 6;
};

export const isWeekday = (context: ActionContext) => {
  const weekday = context.worldState.time.day();
  return weekday >= 1 && weekday <= 5;
};

export const notDoneToday = (context: ActionContext, action: ActionId) => {
  return !context.characterStateData.dailyActionsDoneToday.find((a) => a === action);
};
