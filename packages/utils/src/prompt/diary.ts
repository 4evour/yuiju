import dayjs from "dayjs";

export interface DiaryPromptInput {
  diaryDate: Date;
}

export interface DiarySummaryPromptInput {
  period: "week" | "month" | "year";
  sourcePeriod: "day" | "week" | "month" | "year";
  periodStartDate: Date;
  diaryEndDate: Date;
}

export const defaultDiaryPrompt = `
## 日记任务
请根据提供给你的当天真实事件素材，写一篇属于你自己的私密日记。

## 日记叙事风格
使用第一人称，像在写给自己看的私人日记。
语气自然、私密、细腻，可以有一点小别扭、小开心、小失落和自言自语感。
感受要尽量落在具体人物、地点和事件上，不要只写抽象心情。
不要写成系统总结、流水账、报告、旁白说明或散文朗诵。
比起漂亮句子，更重要的是写清楚真正让自己记住了什么。

## 记忆目标
- 这篇日记不只是“写给当下的自己看”，也是未来回忆今天时的重要线索。
- 写的时候要让未来的自己看完后，能想起今天最重要的事、相关的人、发生的场景，以及自己当时为什么会在意。
- 不要求把一天里所有细节都写全，但至少要把最值得记住的 1 到 3 件事写清楚。
- 感受要尽量挂在具体事件上，不要只写抽象心情，要让人看得出“因为什么而开心、别扭、失落或在意”。

## 事件锚点要求
- 正文里要自然带出一些可回忆的锚点，例如：人物、地点、做了什么、发生了什么变化、最后结果怎样。
- 这些锚点要融进日记叙述里，不要写成条目，也不要像记会议纪要。
- 如果某个瞬间很重要，可以多写一点当时的感受；但不要把整篇都写成纯情绪，而忽略今天到底发生了什么。

## 事实约束
- 只能基于提供的事件素材写，不允许编造未发生的事件、对话、关系变化或心理活动。
- 可以做主观感受表达，但这种感受必须能从素材中合理推出。
- 如果某些内容只是工具总结出来的聊天摘要，也要把它当作当天真实发生过的素材来写，但不要把“摘要”这个概念写进日记里。
- 如果素材里出现了明确的人、地点、行动、物品或结果，尽量保留这些信息，不要全都模糊化成“发生了一些事”“有个人说了什么”。

## 输出要求
- 只输出最终日记正文，不要加标题，不要加“今天的日记：”之类的前缀，不要解释你的写法。
- 分段写，不要连在一起。
`.trim();

export const diaryMemorySearchInstruction =
  "Given a chat conversation, retrieve relevant passages from the subject's past diary that can support an accurate reply.";

/**
 * 构建每日日记的任务提示词。
 *
 * 说明：
 * - 角色和完整的每日日记提示词由调用方显式组合；
 * - 这里只提供本次生成的动态日期。
 */
export function buildDiarySystemPrompt(input: DiaryPromptInput): string {
  return `
## 日记日期
${dayjs(input.diaryDate).format("YYYY-MM-DD")}
`.trim();
}

export function buildDiarySummarySystemPrompt(input: DiarySummaryPromptInput): string {
  const periodText = {
    week: "这一周",
    month: "这个月",
    year: "这一年",
  }[input.period];
  const sourceText = {
    day: "每日 Diary",
    week: "每周总结",
    month: "每月总结",
    year: "每年总结",
  }[input.sourcePeriod];
  const periodStartText = dayjs(input.periodStartDate).format("YYYY-MM-DD");
  const periodEndText = dayjs(input.diaryEndDate).format("YYYY-MM-DD");

  return `
## 总结任务
请根据提供的${sourceText}，整理 ${periodStartText} 至 ${periodEndText} 的${periodText}阶段回忆。
这些素材已经是更细粒度的日记或阶段总结，你不需要重新判断素材是否值得记录，只需要把其中真正适合长期记住的内容整理成一篇自然的阶段性日记。

## 写作要求
- 像在一段时间后翻看自己的日记，轻轻整理这段日子的回忆。
- 不要写成年终总结或数据库摘要。
- 不要逐日罗列，也不要按素材顺序复述；请把相近的人、事、心情和生活节奏合并成自然段。

## 记忆目标
- 这篇阶段总结是未来回忆这段时间的重要线索，不只是把下级素材压缩变短。
- 写的时候要让未来的自己看完后，能想起这一阶段最值得记住的人、地点、事件变化、关系变化和当时为什么会在意。
- 可以概括反复出现的生活节奏、情绪走向或关系变化，但每个概括都必须能从输入材料中找到依据。
- 不要求覆盖所有素材；比起面面俱到，更重要的是保留这一阶段真正有记忆价值的 2 到 5 个重点。

## 事件锚点要求
- 正文里要自然保留可回忆的锚点，例如：出现过的人、具体地点、做过的事、发生的变化、持续了一段时间的状态。
- 如果输入材料里有明确的人名、场景、行动、物品或结果，不要全部模糊成“发生了很多事”“有一些变化”。
- 感受要挂在具体事件或关系上，不要只写抽象情绪，也不要为了文艺感把事实写得太虚。

## 整理边界
- 你可以把重复内容合并，但不要把有差异的事件强行概括成同一件事。

## 事实约束
- 只能基于提供的${sourceText}写，不允许编造未发生的事件、对话、关系变化或心理活动。
- 可以做主观感受表达，但这种感受必须能从素材中合理推出。
- 如果素材本身只是较短的阶段总结，也要把它当作已经归档的真实回忆来整理，但不要把“总结”“素材”这类概念写进正文。
- 不要补写输入材料没有提到的结局、原因或后续发展。

## 输出要求
- 只输出最终阶段日记正文，不要加标题，不要解释你的写法。
- 分段写，不要连在一起。
`.trim();
}
