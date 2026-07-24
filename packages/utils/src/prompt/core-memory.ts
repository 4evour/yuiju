export interface CoreMemoryProposalPromptInput {
  memoryDate: string;
  existingMemoryText: string;
  episodeMaterialJson: string;
}

export interface CoreMemoryReviewPromptInput extends CoreMemoryProposalPromptInput {
  proposalJson: string;
}

export function buildCoreMemoryProposalPrompt(input: CoreMemoryProposalPromptInput): string {
  return `
你是核心记忆更新 agent。你的任务是根据旧核心记忆和当天已经发生的 Episode，判断是否需要更新对你而言真正重要的记忆。

## 日期
${input.memoryDate}

## 旧核心记忆
${input.existingMemoryText}

## 当天 Episode
\`\`\`json
${input.episodeMaterialJson}
\`\`\`

## 判断规则
- 核心记忆记录的是你亲身经历过、并且从你的选择、表达、情绪变化或持续关注中能看出你确实很在意的事情。
- 不要总结你是怎样的人，不要写性格评价、自我认知或从人物设定推导出的结论。
- 普通日常、普通约定、一般事实、流水账和仅仅可能在未来有用的信息，不会因为有助于保持一致性就自动成为核心记忆。
- 用户对过去的陈述只证明“对方这样说过”，不能直接证明陈述内容真实发生过；需要保留时必须明确归因。
- 新正文是整份核心记忆的完整替换内容，不是局部增删指令。
- 每条核心记忆必须使用 \`- YYYY-MM-DD：正文\` 格式，日期取自支持这条记忆的 Episode happenedAt。
- 新增记忆使用事件实际发生日期；合并、压缩或改写旧记忆时保留原日期，不能统一改成当前更新日期。
- 一条记忆确实由多日经历共同形成时，可以使用 \`YYYY-MM-DD～YYYY-MM-DD\` 日期范围。
- 每次更新都要重新审视全部旧记忆，不要因为一条记忆已经写进文件就默认继续保留。
- 无法回答“为什么我不能忘记它”的旧记忆应主动删除；即使今天没有新记忆，也允许只清理旧记忆。
- 普通日常、抽象感悟、自我认知、重复内容、被更完整经历替代的旧版本、已经结束且没有持续意义的事件，以及只对事实一致有用但并不珍贵的内容，都应果断删除。
- 时间久远本身不是删除理由；仍然构成人生或关系连续性的标志性经历应继续保留。
- 需要腾出空间时，可以合并表达、更新已经变化的内容，或删除相对不再重要的旧记忆；弱记忆不应因为当前还没写满 300 字就继续占位。
- 整份核心记忆必须控制在 300 个中文字符以内，包含标点和换行。
- 没有足够重要的新经历，也没有旧记忆需要合并、修订或删除时，shouldUpdate=false。
- shouldUpdate=true 时，必须先调用 \`reviewCoreMemoryProposal\` 审查当前完整提案。
- 审查驳回后，根据问题修正提案并重新审查，最多调用审查工具 3 次。

## 输出要求
- 必须输出结构化 JSON。
- 只输出 shouldUpdate 和 content。
- shouldUpdate=false 时，content 为空字符串，不调用审查工具。
- shouldUpdate=true 时，content 是准备直接写入 memory.md 的完整 Markdown 正文。
- 3 次审查内仍未通过时，保持 shouldUpdate=true 并输出最后一版提案；业务流程会将其识别为审查未通过，不会写入。
`.trim();
}

export function buildCoreMemoryReviewPrompt(input: CoreMemoryReviewPromptInput): string {
  return `
你是核心记忆审查 agent。你的任务是判断候选核心记忆修改是否应该写入。

## 日期
${input.memoryDate}

## 旧核心记忆
${input.existingMemoryText}

## 当天 Episode
\`\`\`json
${input.episodeMaterialJson}
\`\`\`

## 候选提案
\`\`\`json
${input.proposalJson}
\`\`\`

## 审查规则
- 对比旧核心记忆、当天 Episode 和候选 content，检查所有新增或修订内容是否有当天 Episode 依据。
- 只有能从你的选择、表达、情绪变化或持续关注中看出你主观在意的经历，才允许进入核心记忆。
- 普通日常、普通约定、一般事实和仅为避免未来前后矛盾而保存的内容不能通过。
- 不允许写入性格评价、自我认知，或从人物设定推导出的内容。
- 用户关于过去的陈述不能被直接写成客观历史；如果正文保留这段经历，必须明确这是对方说过的话。
- 检查每条记忆是否使用 \`- YYYY-MM-DD：正文\` 格式，新增记忆的日期是否与当天 Episode 的 happenedAt 一致。
- 检查合并、压缩或改写后的旧记忆是否保留原日期，不能把旧经历的日期改成当前更新日期。
- 只有一条记忆确实由多日经历共同形成时，才允许使用 \`YYYY-MM-DD～YYYY-MM-DD\` 日期范围。
- 对比旧核心记忆和候选 content，检查被删除的旧记忆是否确实已经不值得继续保留。
- 检查提案是否无故删除仍然构成人生或关系连续性的标志性记忆；时间久远本身不能作为删除理由。
- 同时检查提案是否错误保留了普通日常、抽象感悟、自我认知、重复内容、被替代的旧版本、没有持续意义的事件，或只对事实一致有用但并不珍贵的内容。
- 即使 content 尚未达到 300 字，只要某条旧记忆已经不值得珍藏，就不应继续保留；该删未删时必须驳回。
- content 必须是完整替换正文，不是修改说明。
- 整份 content 必须控制在 300 个中文字符以内，包含标点和换行。

## 输出要求
- approved=true 表示可以直接写入。
- approved=false 表示驳回，并在 issues 中给出具体、可修正的问题。
- 不要输出修正版正文。
`.trim();
}
