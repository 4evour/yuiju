import { formatProjectTime } from "../time";
import type { ActionId, CharacterStateData, WorldStateData } from "../types";

export interface BuildProactiveGroupMessagePromptInput {
  action: ActionId;
  shareReason: string;
  eventDescription?: string;
  completionContext?: Record<string, unknown>;
  characterStateSnapshot: CharacterStateData;
  worldStateSnapshot: WorldStateData;
  groupContext: {
    groupLabel: string;
    summary?: string;
    historyJson: string;
  };
}

export function buildProactiveGroupMessagePrompt(
  input: BuildProactiveGroupMessagePromptInput,
): string {
  const worldStateSnapshot = {
    ...input.worldStateSnapshot,
    time: formatProjectTime(input.worldStateSnapshot.time, "YYYY-MM-DD HH:mm:ss"),
  };

  return `
## 主动分享任务

你在行动决策时已经产生了想分享生活事件的意图。你现在只需要根据目标群聊上下文，判断此刻是否适合把这件事发到群里，并生成最终群消息。

## 分享意图

${input.shareReason}

## Action 完成事实

Action：${input.action}
事件描述：${input.eventDescription ?? "无"}
完成上下文：
\`\`\`json
${JSON.stringify(input.completionContext ?? {}, null, 2)}
\`\`\`

## 当前角色状态

\`\`\`json
${JSON.stringify(input.characterStateSnapshot, null, 2)}
\`\`\`

## 当前世界状态

\`\`\`json
${JSON.stringify(worldStateSnapshot, null, 2)}
\`\`\`

## 目标群聊

群聊：${input.groupContext.groupLabel}

最近群聊摘要：
${input.groupContext.summary ?? "无"}

最近群聊消息：
\`\`\`json
${input.groupContext.historyJson}
\`\`\`

## 判断要求

- 以“当前世界状态”中的时间作为当前时间，读取“最近群聊消息”中时间最新的一条消息。
- 先判断最近群聊消息是否显示你正在连续自言自语：如果最近主要是你自己在发言、连续分享生活状态，并且没有其他人接话、回应或开启新话题，shouldSend=false。
- 如果不是连续自言自语，再判断群聊是否安静：如果最近群聊消息为空，或最新消息距离当前时间已经超过 3 分钟，说明群聊当前已经安静；只要这件生活事件本身适合自然分享，就可以 shouldSend=true。
- 如果群聊不安静，再判断最近话题是否适合接入：如果最近话题不冲突，且这条生活分享可以用简短自然的方式接入，也可以 shouldSend=true。
- 如果群聊正在聊完全无关且插入会突兀，shouldSend=false。

## 群消息生成要求

- message 要像你刚经历完这件事后，在普通朋友群里顺手发的一句话。
- 优先写 1 句，最多 2 句；可以很短、很日常，不需要把事情讲完整。
- 直接说一个具体事实、状态或轻微吐槽，例如到哪了、刚做完什么、外面怎么样、现在有点什么反应。
- 不要刻意营造氛围，不要连续描写天气、声音、空气和心情。
- 不要写成日记、散文、旁白、朋友圈文案、总结、愿望收束或宣传文案。
- 不要为了显得温柔而泛泛抒情；少用“希望这样的时刻再多一些”“感觉世界都安静了”这类收束式句子。
- 不要每条都使用颜文字、卖萌语气或过度完整的情绪表达。
- 不要复述 Action、分享意图、完成上下文等内部信息，要把它们转成自然生活表达。
`.trim();
}
