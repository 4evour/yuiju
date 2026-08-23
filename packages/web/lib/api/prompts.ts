import type { PromptCustomizationKey } from "@yuiju/utils/types/prompt-customization";
import { requestApiData } from "./client";

export interface PromptCustomizationItem {
  key: PromptCustomizationKey;
  content: string;
  source: "default" | "override";
  updatedAt: string | null;
}

export interface PromptCustomizationPayload {
  items: PromptCustomizationItem[];
}

export type PromptCustomizationMutation =
  | {
      type: "save";
      key: PromptCustomizationKey;
      content: string;
    }
  | {
      type: "restoreDefault";
      key: PromptCustomizationKey;
    };

export const PROMPT_CUSTOMIZATIONS_API_PATH = "/api/nodejs/prompts";

export function fetchPromptCustomizations(url: string): Promise<PromptCustomizationPayload> {
  return requestApiData(url, { cache: "no-store" });
}

export function mutatePromptCustomization(
  url: string,
  { arg }: { arg: PromptCustomizationMutation },
): Promise<PromptCustomizationPayload> {
  if (arg.type === "save") {
    return requestApiData(`${url}/${arg.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: arg.content }),
    });
  }

  return requestApiData(`${url}/${arg.key}`, { method: "DELETE" });
}
