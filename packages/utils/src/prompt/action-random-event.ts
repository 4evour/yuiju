import type { ActionId } from "../types/action";
import type { CharacterStateData } from "../types/state";
import type { WeatherSnapshot } from "../types/weather";

export interface BuildActionRandomEventPromptInput {
  action: ActionId;
  setting: string;
  eventType: "positive" | "negative";
  moodChangeRange: {
    min: number;
    max: number;
  };
  characterState: CharacterStateData;
  time: string;
  weather: WeatherSnapshot | null;
}

export function buildActionRandomEventPrompt(input: BuildActionRandomEventPromptInput): string {
  const location = `${input.characterState.location.major}-${input.characterState.location.minor}`;
  const weather = input.weather
    ? `${input.weather.type}，体感${input.weather.temperatureLevel}`
    : "暂无天气记录";
  const eventTendency = input.eventType === "positive" ? "好事件" : "坏事件";

  return `
你刚完成了一次日常行为，现在需要生成一个发生在行为期间的随机生活事件。

## 当前事实

- 行为：${input.action}
- 场景设定：${input.setting}
- 地点：${location}
- 时间：${input.time}
- 天气：${weather}
- 当前心情：${input.characterState.mood}

## 事件要求

事件倾向已经确定为${eventTendency}，不要重新判断或改变倾向。
事件必须是当前行为期间可能发生的、日常且一次性的小插曲。
事件只能影响你当下的心情，不得改变体力、饱腹、金币、物品、位置或其他状态。
不要引入受伤、长期关系变化、重大剧情或需要后续持续处理的新事实。
description 只描述具体发生了什么，不要包含心情变化数值。
moodChange 必须是 ${input.moodChangeRange.min} 到 ${input.moodChangeRange.max} 之间的整数，由事件实际带来的感受强度决定。
事件只能发生在当前地点，不要引入当前事实之外的跨地点互动、物品或金钱来源。
事件中可以出现符合当前场景的无名路人、顾客、同学或工作人员。
不得凭空创造有名字的新角色、既有亲密关系、新地点、新设施或需要长期延续的剧情。
需要补充当前地点的既有资料时，调用 queryStaticGuide 查询相关条目，不要查询与当前事件无关的资料，也不要据此增加心情以外的状态变化。
`.trim();
}
