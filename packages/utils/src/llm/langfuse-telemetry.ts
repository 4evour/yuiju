import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type { TelemetryOptions } from "ai";
import { getYuijuConfig } from "../config/config";

let langfuseTelemetry: TelemetryOptions | undefined;

export function initializeLangfuseTelemetry() {
  const config = getYuijuConfig().observability?.langfuse;
  if (!config) {
    return;
  }

  const sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: config.publicKey,
        secretKey: config.secretKey,
        baseUrl: config.baseUrl,
        mediaUploadEnabled: false,
      }),
    ],
  });

  sdk.start();
  langfuseTelemetry = {
    integrations: new LangfuseVercelAiSdkIntegration(),
    recordInputs: true,
    recordOutputs: true,
  };
}

export function getLangfuseTelemetry(): TelemetryOptions | undefined {
  return langfuseTelemetry;
}
