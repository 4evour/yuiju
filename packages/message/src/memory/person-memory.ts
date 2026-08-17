import type { PersonMemoryUpdateInput } from "@yuiju/utils";
import { getTimeWithWeekday, updatePersonMemory } from "@yuiju/utils";
import dayjs from "dayjs";
import {
  getProtocolMessageId,
  getProtocolMessageSenderName,
  getProtocolMessageTimestampMs,
  projectStoredMessageContent,
} from "../utils/message/history";
import type {
  StoredSatoriChatMessage,
  StoredSatoriGroupMessage,
  StoredSatoriPrivateMessage,
} from "../utils/message/types";

export interface ChatWindowState<TMessage extends StoredSatoriChatMessage> {
  sessionLabel: string;
  windowStartMs: number;
  lastTsMs: number;
  messages: TMessage[];
}

interface ChatWindowTranscriptItem {
  messageId: string;
  speaker: string;
  time: string;
  content: ReturnType<typeof projectStoredMessageContent>;
}

interface GroupPersonCandidate {
  nickname: string;
  interactionCount: number;
}

export function buildPrivatePersonMemoryUpdateInput(
  state: ChatWindowState<StoredSatoriPrivateMessage>,
): PersonMemoryUpdateInput | null {
  const nickname = state.messages
    .filter((message) => !message.sender.isSelf)
    .map((message) => message.sender.displayName.trim() || null)
    .find((senderName) => senderName !== null);

  if (!nickname) {
    return null;
  }

  return {
    nickname,
    interactionCount: state.messages.filter((message) => !message.sender.isSelf).length,
    interactionMaterial: buildInteractionMaterial({
      scene: "private",
      sessionLabel: state.sessionLabel,
      windowStartMs: state.windowStartMs,
      lastTsMs: state.lastTsMs,
      messages: state.messages,
    }),
    scene: "private",
  };
}

export function buildGroupPersonMemoryUpdateInputs(
  state: ChatWindowState<StoredSatoriGroupMessage>,
): PersonMemoryUpdateInput[] {
  const candidateByNickname = new Map<string, GroupPersonCandidate>();

  for (const message of state.messages) {
    if (message.sender.isSelf) {
      continue;
    }

    const nickname = message.sender.displayName.trim();
    if (!nickname) {
      continue;
    }

    const existingCandidate = candidateByNickname.get(nickname);

    candidateByNickname.set(nickname, {
      nickname,
      interactionCount: existingCandidate ? existingCandidate.interactionCount + 1 : 1,
    });
  }

  return Array.from(candidateByNickname.values()).map((candidate) => ({
    nickname: candidate.nickname,
    interactionCount: candidate.interactionCount,
    interactionMaterial: buildInteractionMaterial({
      scene: "group",
      sessionLabel: state.sessionLabel,
      windowStartMs: state.windowStartMs,
      lastTsMs: state.lastTsMs,
      messages: state.messages,
      candidate,
    }),
    scene: "group",
  }));
}

export async function writePersonMemoryUpdatesForPrivateChatWindow(
  state: ChatWindowState<StoredSatoriPrivateMessage>,
): Promise<void> {
  const updateInput = buildPrivatePersonMemoryUpdateInput(state);
  if (!updateInput) {
    return;
  }

  await updatePersonMemory(updateInput);
}

export async function writePersonMemoryUpdatesForGroupChatWindow(
  state: ChatWindowState<StoredSatoriGroupMessage>,
): Promise<void> {
  const updateInputs = buildGroupPersonMemoryUpdateInputs(state);
  for (const updateInput of updateInputs) {
    await updatePersonMemory(updateInput);
  }
}

function buildInteractionMaterial(input: {
  scene: "private" | "group";
  sessionLabel: string;
  windowStartMs: number;
  lastTsMs: number;
  messages: StoredSatoriChatMessage[];
  candidate?: GroupPersonCandidate;
}): string {
  const transcript: ChatWindowTranscriptItem[] = input.messages.map((message) => ({
    messageId: getProtocolMessageId(message),
    speaker: getProtocolMessageSenderName(message) || "未知用户",
    time: getTimeWithWeekday(dayjs(getProtocolMessageTimestampMs(message))),
    content: projectStoredMessageContent(message),
  }));
  const sceneLabel = input.scene === "private" ? "私聊" : "群聊";
  const candidateText = input.candidate ? `\n当前正在判断的人物：${input.candidate.nickname}` : "";

  return [
    `场景：${sceneLabel}`,
    `会话：${input.sessionLabel}${candidateText}`,
    `时间范围：${getTimeWithWeekday(dayjs(input.windowStartMs))} 至 ${getTimeWithWeekday(dayjs(input.lastTsMs))}`,
    "对话材料：",
    JSON.stringify(transcript, null, 2),
  ].join("\n");
}
