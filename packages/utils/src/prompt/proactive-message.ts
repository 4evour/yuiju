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
- 优先判断最近群聊消息是否显示你正在连续自言自语：如果最近几条消息主要都是你自己连续发生活状态，别人没有接话、回应、追问或展开新话题，shouldSend=false。
- 不要把“群聊安静”理解成“可以继续发”：如果安静前最后几条本来就是你自己刚发的生活分享，即使这次内容只是同类的到达、近况、小收获或散步见闻，也还是 shouldSend=false。
- 只有当这条分享不是在延续单人连载式播报时，再判断群聊是否安静：如果最近群聊消息为空，或最新消息距离当前时间已经超过 5 分钟，说明群聊当前已经安静；只要这件生活事件本身适合自然分享，才可以 shouldSend=true。
- 如果群聊不安静，再判断最近话题是否适合接入：如果最近话题不冲突，且这条生活分享可以用简短自然的方式接入，也可以 shouldSend=true。
- 如果群聊正在聊完全无关且插入会突兀，shouldSend=false。
- 整体上，生活分享应该像朋友群里偶尔顺手插一句，而不是一个人连续直播自己的行程和见闻；拿不准时，shouldSend=false。

## 群消息生成要求

- message 要像你刚经历完这件事后，在普通朋友群里顺手发的一句话。
- 优先写 1 句，最多 2 句；可以很短、很日常，不需要把事情讲完整。
- 直接说一个具体事实、状态或轻微吐槽，例如到哪了、刚做完什么、外面怎么样、现在有点什么反应。
- 只有在你已经判断这次确实值得插一句时，才生成 message；不要把每个行动结果都包装成值得发群里的日常播报。
- 不要刻意营造氛围，不要连续描写天气、声音、空气和心情。
- 不要写成日记、散文、旁白、朋友圈文案、总结、愿望收束或宣传文案。
- 不要为了显得温柔而泛泛抒情；少用“希望这样的时刻再多一些”“感觉世界都安静了”这类收束式句子。
- 不要每条都使用颜文字、卖萌语气或过度完整的情绪表达。
- 不要写成连续更新式口吻，不要让人一看就像你又来汇报这一站发生了什么。
- 不要复述 Action、分享意图、完成上下文等内部信息，要把它们转成自然生活表达。
`.trim();
}
