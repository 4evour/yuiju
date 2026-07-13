/**
 * 从模型响应末尾提取 JSON，忽略其前面的解释文本。
 */
export function extractLastJson(text: string): string | undefined {
  const trimmedText = text.trim();
  const codeBlocks = trimmedText.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
  let lastCodeBlock: string | undefined;

  for (const codeBlock of codeBlocks) {
    lastCodeBlock = codeBlock[1].trim();
  }

  if (lastCodeBlock != null) {
    try {
      JSON.parse(lastCodeBlock);
      return lastCodeBlock;
    } catch {
      // 继续按原始文本查找末尾 JSON，让后续 schema 校验处理失败情形。
    }
  }

  for (let index = trimmedText.length - 1; index >= 0; index -= 1) {
    if (trimmedText[index] !== "{" && trimmedText[index] !== "[") {
      continue;
    }

    const json = trimmedText.slice(index);

    try {
      JSON.parse(json);
      return json;
    } catch {
      // 当前位置不是完整 JSON 的起始位置，继续向前查找。
    }
  }
}
