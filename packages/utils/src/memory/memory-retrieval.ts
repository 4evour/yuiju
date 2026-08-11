import { generateText, stepCountIs, tool } from "ai";
import { getLangfuseTelemetry } from "../llm/langfuse-telemetry";
import { flashModel } from "../llm/models";
import { createToolCallLoggingHooks } from "../llm/tool-call-logger";
import { diarySearchTool, semanticDiarySearchTool } from "../llm/tools/memory-search";
import { getPersonMemoryTool, listPersonMemoriesTool } from "../llm/tools/person-memory";
import { queryStaticGuideTool } from "../llm/tools/query-static-guide";
import { memoryRetrievalSystemPrompt } from "../prompt/memory-retrieval";

export interface MemoryRetrievalInput {
  query: string;
  abortSignal: AbortSignal;
  semanticDiarySearchCallLimit?: number;
}

export async function retrieveMemory(input: MemoryRetrievalInput): Promise<string> {
  let semanticDiarySearchCallCount = 0;
  const tools = {
    diarySearch: diarySearchTool,
    semanticDiarySearch: tool({
      description: semanticDiarySearchTool.description,
      inputSchema: semanticDiarySearchTool.inputSchema,
      execute: async (toolInput, options) => {
        if (
          input.semanticDiarySearchCallLimit !== undefined &&
          semanticDiarySearchCallCount >= input.semanticDiarySearchCallLimit
        ) {
          return "本次语义日记检索已达到调用上限，请使用已有查询结果。";
        }

        semanticDiarySearchCallCount += 1;
        return semanticDiarySearchTool.execute(toolInput, options);
      },
    }),
    listPersonMemories: listPersonMemoriesTool,
    getPersonMemory: getPersonMemoryTool,
    queryStaticGuide: queryStaticGuideTool,
  };
  const toolNames = Object.keys(tools) as Array<keyof typeof tools>;

  const result = await generateText({
    model: flashModel,
    providerOptions: {
      flash: {
        enable_thinking: false,
      },
    },
    instructions: memoryRetrievalSystemPrompt,
    prompt: input.query,
    tools,
    prepareStep: () => {
      if (
        input.semanticDiarySearchCallLimit === undefined ||
        semanticDiarySearchCallCount < input.semanticDiarySearchCallLimit
      ) {
        return;
      }

      return {
        activeTools: toolNames.filter((toolName) => toolName !== "semanticDiarySearch"),
      };
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
