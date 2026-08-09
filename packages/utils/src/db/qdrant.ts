import { QdrantClient } from "@qdrant/js-client-rest";
import { getYuijuConfig } from "../config/config";

const qdrantConfig = getYuijuConfig().database.qdrant;
const qdrantClient = qdrantConfig
  ? new QdrantClient({
      url: qdrantConfig.baseUrl,
      apiKey: qdrantConfig.apiKey,
    })
  : null;

export function hasQdrantClient(): boolean {
  return qdrantClient !== null;
}

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    throw new Error("Qdrant is not configured");
  }

  return qdrantClient;
}
