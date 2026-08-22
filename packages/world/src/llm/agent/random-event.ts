import { generateStructuredOutput } from "@yuiju/utils/llm/generate-structured-output";
import { getFlashModel } from "@yuiju/utils/llm/models";
import { createToolCallLoggingHooks } from "@yuiju/utils/llm/tool-call-logger";
import { queryStaticGuideTool } from "@yuiju/utils/llm/tools/query-static-guide";
import { buildActionRandomEventPrompt } from "@yuiju/utils/prompt/action-random-event";
import type { ActionContext } from "@yuiju/utils/types/action";
import { Output, stepCountIs } from "ai";
import { z } from "zod";

export interface ActionRandomEvent {
  type: "positive" | "negative";
  description: string;
  moodChange: number;
}

export interface GenerateActionRandomEventInput {
  context: ActionContext;
  setting: string;
  triggerProbability: number;
  positiveProbability: number;
}

const POSITIVE_MOOD_CHANGE_RANGE = {
  min: 1,
  max: 4,
};

const NEGATIVE_MOOD_CHANGE_RANGE = {
  min: -15,
  max: -5,
};

export async function generateActionRandomEvent(
  input: GenerateActionRandomEventInput,
): Promise<ActionRandomEvent | undefined> {
  if (Math.random() >= input.triggerProbability) {
    return undefined;
  }

  const type = Math.random() < input.positiveProbability ? "positive" : "negative";
  const moodChangeRange =
    type === "positive" ? POSITIVE_MOOD_CHANGE_RANGE : NEGATIVE_MOOD_CHANGE_RANGE;

  const { output } = await generateStructuredOutput({
    model: getFlashModel(),
    tools: {
      queryStaticGuide: queryStaticGuideTool,
    },
    stopWhen: stepCountIs(20),
    ...createToolCallLoggingHooks({
      scene: "world.llm.random-event",
    }),
    prompt: buildActionRandomEventPrompt({
      action: input.context.characterStateData.action,
      setting: input.setting,
      eventType: type,
      moodChangeRange,
      characterState: input.context.characterStateData,
      time: input.context.worldState.time.format("YYYY-MM-DD HH:mm"),
      weather: input.context.worldState.getWeather(),
    }),
    output: Output.object({
      schema: z.object({
        description: z.string().describe("具体描述这次日常小事件中发生了什么"),
        moodChange: z
          .number()
          .int()
          .min(moodChangeRange.min)
          .max(moodChangeRange.max)
          .describe("这次事件实际带来的心情变化量"),
      }),
    }),
  });

  return {
    type,
    description: output.description,
    moodChange: output.moodChange,
  };
}

export function buildActionRandomEventDescription(input: {
  actionSummaryText: string;
  actionMoodChange: number;
  randomEvent?: ActionRandomEvent & {
    actualMoodChange: number;
  };
}): {
  actionSummaryText: string;
  eventDescription?: string;
  totalMoodChange: number;
} {
  const totalMoodChange = input.actionMoodChange + (input.randomEvent?.actualMoodChange ?? 0);
  if (!input.randomEvent) {
    return {
      actionSummaryText: input.actionSummaryText,
      totalMoodChange,
    };
  }

  const eventDescription = `${input.randomEvent.description}，${buildMoodChangeDescription(input.randomEvent.actualMoodChange)}`;
  return {
    actionSummaryText: `${input.actionSummaryText}；${eventDescription}；这次行为结束后${buildMoodChangeDescription(totalMoodChange)}`,
    eventDescription,
    totalMoodChange,
  };
}

export function buildMoodChangeDescription(actualMoodChange: number): string {
  if (actualMoodChange > 0) {
    return `心情提升了${actualMoodChange}点`;
  }
  if (actualMoodChange < 0) {
    return `心情降低了${Math.abs(actualMoodChange)}点`;
  }
  return "心情没有发生变化";
}
