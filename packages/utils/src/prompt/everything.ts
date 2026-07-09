export const structuredOutputJsonPrompt = `
# 输出要求
- 只输出严格满足下面 JSON Schema 的 JSON 文本。
- 回复的第一个非空字符必须是 \`{\` 或 \`[\`，最后一个非空字符必须是 \`}\` 或 \`]\`。
- JSON 前后不要输出任何自然语言、解释、寒暄、思考过程或 Markdown 代码块。
- 不要把 JSON 包成字符串。
JSON Schema:
`.trim();
