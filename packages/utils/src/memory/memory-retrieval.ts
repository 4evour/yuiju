import { generateText, stepCountIs } from "ai";
import { getLangfuseTelemetry } from "../llm/langfuse-telemetry";
import { flashModel } from "../llm/models";
import { createToolCallLoggingHooks } from "../llm/tool-call-logger";
import {
  diarySearchTool,
  semanticDiarySearchTool,
  todayEventSearchTool,
} from "../llm/tools/memory-search";
import { getPersonMemoryTool, listPersonMemoriesTool } from "../llm/tools/person-memory";
import { queryAvailableInventoryItems } from "../llm/tools/query-available-inventory-items";
import { queryStateTool } from "../llm/tools/query-state";
import { queryStaticGuideTool } from "../llm/tools/query-static-guide";
import { memoryRetrievalSystemPrompt } from "../prompt/memory-retrieval";

export interface MemoryRetrievalInput {
  query: string;
  abortSignal: AbortSignal;
}

export async function retrieveMemory(input: MemoryRetrievalInput): Promise<string> {
  const result = await generateText({
    model: flashModel,
    providerOptions: {
      flash: {
        enable_thinking: false,
      },
    },
    instructions: memoryRetrievalSystemPrompt,
    prompt: input.query,
    tools: {
      todayEventSearch: todayEventSearchTool,
      diarySearch: diarySearchTool,
      semanticDiarySearch: semanticDiarySearchTool,
      listPersonMemories: listPersonMemoriesTool,
      getPersonMemory: getPersonMemoryTool,
      queryStateTool,
      queryStaticGuide: queryStaticGuideTool,
      queryAvailableInventoryItems,
    },
    stopWhen: stepCountIs(20),
    abortSignal: input.abortSignal,
    telemetry: getLangfuseTelemetry(),
    ...createToolCallLoggingHooks({
      scene: "memory.retrieval",
    }),
  });

  return result.text.trim();
}
