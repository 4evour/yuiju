"use client";

import type { PromptCustomizationKey } from "@yuiju/utils/types/prompt-customization";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  fetchPromptCustomizations,
  mutatePromptCustomization,
  PROMPT_CUSTOMIZATIONS_API_PATH,
} from "@/lib/api/prompts";

export function usePromptCustomizations() {
  const query = useSWR(PROMPT_CUSTOMIZATIONS_API_PATH, fetchPromptCustomizations);
  const mutation = useSWRMutation(PROMPT_CUSTOMIZATIONS_API_PATH, mutatePromptCustomization, {
    populateCache: true,
    revalidate: false,
  });

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isMutating: mutation.isMutating,
    savePromptCustomization: (key: PromptCustomizationKey, content: string) =>
      mutation.trigger({ type: "save", key, content }),
    restoreDefaultPrompt: (key: PromptCustomizationKey) =>
      mutation.trigger({ type: "restoreDefault", key }),
  };
}
