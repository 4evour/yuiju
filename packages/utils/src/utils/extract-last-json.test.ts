import { describe, expect, it } from "vitest";
import { extractLastJson } from "./extract-last-json";

describe("extractLastJson", () => {
  it("原样返回纯 JSON 对象", () => {
    const json = '{"approved":true,"reason":"变更合理"}';

    expect(extractLastJson(json)).toBe(json);
  });

  it("提取说明文本后 JSON 代码块中的对象", () => {
    const text = [
      "根据查询结果分析：",
      "",
      "```json",
      "{",
      '  "approved": false,',
      '  "issues": ["状态不一致"]',
      "}",
      "```",
    ].join("\n");

    expect(extractLastJson(text)).toBe('{\n  "approved": false,\n  "issues": ["状态不一致"]\n}');
  });

  it("提取闭合代码块紧贴 JSON 的对象", () => {
    expect(extractLastJson('说明文本\n```json\n{"shouldUpdate":false,"changes":[]}```')).toBe(
      '{"shouldUpdate":false,"changes":[]}',
    );
  });

  it("提取说明文本后未包裹代码块的对象", () => {
    const text = [
      "两个变更依据充分，与当前状态一致。",
      "",
      '{"approved":true,"reason":"变更合理"}',
    ].join("\n");

    expect(extractLastJson(text)).toBe('{"approved":true,"reason":"变更合理"}');
  });

  it("提取末尾的 JSON 数组", () => {
    expect(extractLastJson('结果如下：\n[1, {"approved": true}]')).toBe('[1, {"approved": true}]');
  });

  it("没有完整 JSON 时返回 undefined", () => {
    expect(extractLastJson("结果如下：{approved: true}")).toBeUndefined();
  });
});
