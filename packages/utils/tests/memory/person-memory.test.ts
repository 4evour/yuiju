import { describe, expect, it } from "vitest";
import { PersonMemoryFormatError } from "../../src/memory/person-memory/format";
import {
  EMPTY_PERSON_MEMORY_SECTION,
  PERSON_MEMORY_SECTION_KEYS,
  type PersonMemoryDocument,
} from "../../src/memory/person-memory/types";
import {
  applyPersonMemoryProposalToDocument,
  findPersonMemoryProposalOwnershipIssue,
} from "../../src/memory/person-memory/update";

function buildInteractionMaterial(input: {
  candidate: string;
  transcript: Array<{ speaker: string; text: string }>;
}): string {
  return [
    "场景：群聊",
    "会话：测试群",
    `当前正在判断的人物：${input.candidate}`,
    "对话材料：",
    JSON.stringify(
      input.transcript.map((message, index) => ({
        messageId: `message-${index}`,
        speaker: message.speaker,
        time: "2026-06-23 12:00:00",
        content: [{ type: "text", data: { text: message.text } }],
      })),
      null,
      2,
    ),
  ].join("\n");
}

function buildMemoryDocument(overrides: Partial<PersonMemoryDocument> = {}): PersonMemoryDocument {
  return {
    nickname: "B",
    lastUpdatedAt: "2026-06-22T12:00:00+08:00",
    sections: {
      称呼: "B",
      喜好: EMPTY_PERSON_MEMORY_SECTION,
      雷区: EMPTY_PERSON_MEMORY_SECTION,
      最近在忙什么: EMPTY_PERSON_MEMORY_SECTION,
      悠酱对她的态度: EMPTY_PERSON_MEMORY_SECTION,
      最近一次值得记住的互动: EMPTY_PERSON_MEMORY_SECTION,
      其他补充: EMPTY_PERSON_MEMORY_SECTION,
    },
    ...overrides,
  };
}

describe("person memory proposal ownership review", () => {
  it("会拒绝把 A 自述的近况写进 B 的人物记忆", () => {
    const issue = findPersonMemoryProposalOwnershipIssue({
      scene: "group",
      nickname: "B",
      interactionMaterial: buildInteractionMaterial({
        candidate: "B",
        transcript: [
          { speaker: "A", text: "我最近在准备画稿。" },
          { speaker: "B", text: "加油。" },
        ],
      }),
      proposal: {
        shouldUpdate: true,
        changes: [
          {
            section: "最近在忙什么",
            content: "2026-06-23：在准备画稿。",
            reason: "A 在群聊中说自己最近在准备画稿。",
          },
        ],
      },
    });

    expect(issue).toContain("A");
    expect(issue).toContain("B");
  });

  it("允许把 B 自述的近况写进 B 的人物记忆", () => {
    const issue = findPersonMemoryProposalOwnershipIssue({
      scene: "group",
      nickname: "B",
      interactionMaterial: buildInteractionMaterial({
        candidate: "B",
        transcript: [
          { speaker: "A", text: "我最近在准备画稿。" },
          { speaker: "B", text: "我最近在整理角色设定。" },
        ],
      }),
      proposal: {
        shouldUpdate: true,
        changes: [
          {
            section: "最近在忙什么",
            content: "2026-06-23：在整理角色设定。",
            reason: "B 在群聊中说自己最近在整理角色设定。",
          },
        ],
      },
    });

    expect(issue).toBeNull();
  });

  it("会拒绝 proposal 写入非法 section 格式", () => {
    expect(() =>
      applyPersonMemoryProposalToDocument({
        nickname: "B",
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

    expect(PERSON_MEMORY_SECTION_KEYS).toContain("喜好");
  });
});
