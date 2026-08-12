import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel } from "ai";
import {
  getYuijuConfig,
  type YuijuLlmModelSourcesConfig,
  type YuijuLlmModelsConfig,
} from "../config";
import { logger } from "../logger";

const config = getYuijuConfig();

// 模型调用失败后的冷却时间
const MODEL_SOURCE_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

class LlmModelSourceAvailability {
  private cooldownUntilList: number[];

  constructor(sourceCount: number) {
    this.cooldownUntilList = Array.from({ length: sourceCount }, () => 0);
  }

  getCandidateIndexes(now: number): number[] {
    const availableIndexes: number[] = [];
    const cooldownIndexes: number[] = [];

    for (let index = 0; index < this.cooldownUntilList.length; index += 1) {
      if (this.cooldownUntilList[index] > now) {
        cooldownIndexes.push(index);
      } else {
        availableIndexes.push(index);
      }
    }

    return [...availableIndexes, ...cooldownIndexes];
  }

  markFailed(index: number, now: number) {
    this.cooldownUntilList[index] = now + MODEL_SOURCE_FAILURE_COOLDOWN_MS;
  }
}

function createFallbackModel(
  name: keyof YuijuLlmModelsConfig,
  sources: YuijuLlmModelSourcesConfig,
) {
  const models = sources.map((source) => {
    const provider = createOpenAICompatible({
      baseURL: source.baseUrl,
      apiKey: source.apiKey,
      name,
      supportsStructuredOutputs: true,
    });

    return provider(source.model);
  });
  const availability = new LlmModelSourceAvailability(models.length);

  return wrapLanguageModel({
    model: {
      specificationVersion: "v4",
      provider: `yuiju-${name}`,
      modelId: sources.map((source) => source.model).join(" -> "),
      supportedUrls: models[0].supportedUrls,

      async doGenerate(params) {
        const candidateIndexes = availability.getCandidateIndexes(Date.now());

        for (const [candidateIndex, index] of candidateIndexes.entries()) {
          try {
            return await models[index].doGenerate(params);
          } catch (error: any) {
            if (
              params.abortSignal?.aborted ||
              error?.name === "AbortError" ||
              error?.message === "replaced by newer group chat request"
            ) {
              throw error;
            }

            const now = Date.now();
            availability.markFailed(index, now);

            if (candidateIndex === candidateIndexes.length - 1) {
              throw error;
            }

            logger.error("[llm", error);

            logger.error("[llm] 模型来源调用失败，切换到备用来源", {
              modelType: name,
              modelName: sources[index]?.model,
              failedSourceIndex: index,
              errorMessage: error?.message,
            });
          }
        }

        throw new Error(`[llm] ${name} 模型没有可用来源`);
      },

      async doStream(params) {
        const candidateIndexes = availability.getCandidateIndexes(Date.now());

        for (const [candidateIndex, index] of candidateIndexes.entries()) {
          try {
            return await models[index].doStream(params);
          } catch (error: any) {
            if (
              params.abortSignal?.aborted ||
              error?.name === "AbortError" ||
              error?.message === "replaced by newer group chat request"
            ) {
              throw error;
            }

            const now = Date.now();
            availability.markFailed(index, now);

            if (candidateIndex === candidateIndexes.length - 1) {
              throw error;
            }

            logger.error("[llm] 模型来源调用失败，切换到备用来源", {
              modelType: name,
              modelName: sources[index]?.model,
              failedSourceIndex: index,
              errorMessage: error?.message,
            });
          }
        }

        throw new Error(`[llm] ${name} 模型没有可用来源`);
      },
    },
    middleware: [],
  });
}

/**
 * 用于复杂决策、长链路思考的强模型。
 */
export const chatModel = createFallbackModel("chat", config.llm.models.chat);

/**
 * 用于复杂决策、长链路思考的强模型。
 */
export const strongModel = createFallbackModel("strong", config.llm.models.strong);

/**
 * 需要快速响应、轻文本类工作
 */
export const flashModel = createFallbackModel("flash", config.llm.models.flash);

/**
 * 主要用于图片描述（识图场景）
 */
export const visionModel = createFallbackModel("vision", config.llm.models.vision);
