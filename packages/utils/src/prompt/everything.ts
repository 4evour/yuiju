export const structuredOutputJsonPrompt = `
# 输出要求
只输出符合以下 JSON Schema 的 JSON，不要输出 Markdown 代码块或其他内容。
JSON Schema:
`.trim();

export const structuredOutputRepairPrompt = `
# 任务
你会收到一段未通过校验的结构化输出和校验错误。
根据校验错误修正 JSON 语法、字段类型、结构和值约束，并尽量保留原始内容。
只输出符合以下 JSON Schema 的 JSON，不要输出 Markdown 代码块或解释。
JSON Schema:
`.trim();
