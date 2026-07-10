export const structuredOutputJsonPrompt = `
# 输出要求
只输出一个完整 JSON 值，不要输出 Markdown 代码块。
JSON 外不要输出任何字符。
不要输出思考过程、解释、自然语言、前缀或后缀。
输出内容必须能被 JS 代码的 JSON.parse 直接解析。
输出必须严格满足下面的 JSON Schema。
JSON Schema:
`.trim();
