import { describe, expect, it } from "vitest";
import { PersonMemoryFormatError } from "../../src/memory/person-memory/format";
import { parsePersonMemoryJson } from "../../src/memory/person-memory/storage";
import {
  EMPTY_PERSON_MEMORY_SECTION,
  PERSON_MEMORY_SECTION_KEYS,
  type PersonMemoryDocument,
} from "../../src/memory/person-memory/types";
import { applyPersonMemoryProposalToDocument } from "../../src/memory/person-memory/update";
import { buildPersonMemoryProposalPrompt, buildPersonMemoryReviewPrompt } from "../../src/prompt";

function buildMemoryDocument(overrides: Partial<PersonMemoryDocument> = {}): PersonMemoryDocument {
  return {
    nickname: "猫羽芽",
    lastUpdatedAt: "2026-06-22T12:00:00+08:00",
    sections: {
      称呼: "猫羽芽",
      喜好: "喜欢画画。",
      雷区: EMPTY_PERSON_MEMORY_SECTION,
      最近在忙什么: "2026-06-20：在整理画稿。",
      悠酱对她的态度: "觉得她说话很温和。",
      最近一次值得记住的互动: "2026-06-20：她给悠酱看了新画。",
      其他补充: EMPTY_PERSON_MEMORY_SECTION,
    },
    ...overrides,
  };
}

describe("person memory storage", () => {
  it("会解析并规范化合法人物记忆文件", () => {
    const memory = parsePersonMemoryJson(
      JSON.stringify({
        ...buildMemoryDocument(),
        sections: {
          ...buildMemoryDocument().sections,
          称呼: "  猫羽芽  ",
          其他补充: "  （暂无）  ",
        },
      }),
    );

    expect(memory.nickname).toBe("猫羽芽");
    expect(memory.sections.称呼).toBe("猫羽芽");
    expect(memory.sections.其他补充).toBe(EMPTY_PERSON_MEMORY_SECTION);
  });

  it("会拒绝缺少固定 section 的人物记忆文件", () => {
    const document = buildMemoryDocument();
    const { 称呼, ...sectionsWithoutNickname } = document.sections;

    expect(() =>
      parsePersonMemoryJson(
        JSON.stringify({
          ...document,
          sections: sectionsWithoutNickname,
        }),
      ),
    ).toThrow(PersonMemoryFormatError);
    expect(称呼).toBe("猫羽芽");
  });

  it("会拒绝列表格式的人物记忆字段", () => {
    const document = buildMemoryDocument({
      sections: {
        ...buildMemoryDocument().sections,
        喜好: "- 喜欢画画",
      },
    });

    expect(() => parsePersonMemoryJson(JSON.stringify(document))).toThrow(PersonMemoryFormatError);
  });
});

describe("person memory proposal applying", () => {
  it("会基于空旧记忆创建完整 section 对象", () => {
    const memory = applyPersonMemoryProposalToDocument({
      nickname: "猫羽芽",
      existingMemory: null,
      proposal: {
        shouldUpdate: true,
        changes: [
          {
            section: "称呼",
            content: "猫羽芽",
            reason: "她在本次互动中被明确称为猫羽芽。",
          },
        ],
      },
    });

    expect(memory.nickname).toBe("猫羽芽");
    expect(memory.sections.称呼).toBe("猫羽芽");
    for (const section of PERSON_MEMORY_SECTION_KEYS.filter((section) => section !== "称呼")) {
      expect(memory.sections[section]).toBe(EMPTY_PERSON_MEMORY_SECTION);
    }
  });

  it("只覆盖 proposal 指定的 section，并保留旧记忆其他字段", () => {
    const existingMemory = buildMemoryDocument();
    const memory = applyPersonMemoryProposalToDocument({
      nickname: "猫羽芽",
      existingMemory,
      proposal: {
        shouldUpdate: true,
        changes: [
          {
            section: "最近在忙什么",
            content: "2026-06-22：在准备新的角色草图。",
            reason: "她明确说了今天的安排。",
          },
        ],
      },
    });

    expect(memory.sections.最近在忙什么).toBe("2026-06-22：在准备新的角色草图。");
    expect(memory.sections.喜好).toBe(existingMemory.sections.喜好);
    expect(memory.sections.悠酱对她的态度).toBe(existingMemory.sections.悠酱对她的态度);
  });

  it("会拒绝 proposal 写入列表格式 section", () => {
    expect(() =>
      applyPersonMemoryProposalToDocument({
        nickname: "猫羽芽",
        existingMemory: buildMemoryDocument(),
        proposal: {
          shouldUpdate: true,
          changes: [
            {
              section: "喜好",
              content: "- 喜欢画画",
              reason: "测试非法格式。",
            },
          ],
        },
      }),
    ).toThrow(PersonMemoryFormatError);
  });
});

describe("person memory update agent prompt", () => {
  it("要求 proposal agent 不把 A 的事实写入 B 的人物记忆", () => {
    const prompt = buildPersonMemoryProposalPrompt({
      scene: "group",
      nickname: "B",
      currentTime: "2026-06-23",
      existingMemoryText: "（无，当前尚未建立人物记忆）",
      sectionKeys: PERSON_MEMORY_SECTION_KEYS,
      interactionMaterial: [
        "场景：群聊",
        "会话：测试群",
        "当前正在判断的人物：B",
        "对话材料：",
        JSON.stringify([
          {
            speaker: "A",
            content: [{ type: "text", data: { text: "我最近在准备画稿。" } }],
          },
          {
            speaker: "B",
            content: [{ type: "text", data: { text: "加油。" } }],
          },
        ]),
      ].join("\n"),
    });

    expect(prompt).toContain("当前人物是唯一允许被更新的人物");
    expect(prompt).toContain("不能把 A 自述的近况、喜好、雷区或事件写进 B 的人物记忆");
    expect(prompt).toContain("信息属于其他发言者或对象，而不是当前人物，就应该 shouldUpdate=false");
  });

  it("要求 review agent 驳回跨人物归因的候选提案", () => {
    const prompt = buildPersonMemoryReviewPrompt({
      scene: "group",
      nickname: "B",
      currentTime: "2026-06-23",
      existingMemoryText: "（无，当前尚未建立人物记忆）",
      interactionMaterial: [
        "场景：群聊",
        "会话：测试群",
        "当前正在判断的人物：B",
        "对话材料：",
        JSON.stringify([
          {
            speaker: "A",
            content: [{ type: "text", data: { text: "我最近在准备画稿。" } }],
          },
          {
            speaker: "B",
            content: [{ type: "text", data: { text: "加油。" } }],
          },
        ]),
      ].join("\n"),
      proposalJson: JSON.stringify({
        shouldUpdate: true,
        changes: [
          {
            section: "最近在忙什么",
            content: "2026-06-23：在准备画稿。",
            reason: "A 在群聊中说自己最近在准备画稿。",
          },
        ],
      }),
    });

    expect(prompt).toContain("把其他发言者、被提到的人或旁观对象的事实写进当前人物记忆");
    expect(prompt).toContain("A 自述的近况、喜好、雷区或事件不能被写到 B 的人物记忆里");
  });
});
