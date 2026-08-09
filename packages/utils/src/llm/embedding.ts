import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { embedMany } from "ai";
import { getYuijuConfig } from "../config/config";

const embeddingConfig = getYuijuConfig().llm.models.embedding;
const embeddingModel = embeddingConfig
  ? createOpenAICompatible({
      baseURL: embeddingConfig.baseUrl,
      apiKey: embeddingConfig.apiKey,
      name: "embedding",
    }).embeddingModel(embeddingConfig.model)
  : null;

export function hasEmbeddingModel(): boolean {
  return embeddingModel !== null;
}

export async function embedTexts(values: string[]): Promise<number[][]> {
  if (!embeddingModel) {
    throw new Error("Embedding model is not configured");
  }

  const result = await embedMany({
    model: embeddingModel,
    values,
    providerOptions: {
      openaiCompatible: {
        dimensions: embeddingConfig!.dimensions,
      },
    },
  });

  return result.embeddings;
}
