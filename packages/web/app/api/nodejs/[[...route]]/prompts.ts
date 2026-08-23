import {
  deletePromptCustomization,
  getPromptCustomizationOverrides,
  savePromptCustomization,
} from "@yuiju/utils/db/operations/prompt-customization";
import { getPromptCustomizationContent } from "@yuiju/utils/prompt/prompt-customization";
import {
  type PromptCustomizationKey,
  promptCustomizationKeys,
} from "@yuiju/utils/types/prompt-customization";
import { Hono } from "hono";
import { z } from "zod";
import type { PromptCustomizationPayload } from "@/lib/api/prompts";
import { rejectPublicRequest } from "./public-guard";

const promptCustomizationKeySchema = z.enum(promptCustomizationKeys);
const promptCustomizationInputSchema = z.strictObject({
  content: z.string().refine((content) => content.trim().length > 0, {
    message: "提示词内容不能为空",
  }),
});

export const promptsRoute = new Hono();

promptsRoute.use("*", async (context, next) => {
  const blocked = rejectPublicRequest(context);
  if (blocked) {
    return blocked;
  }
  await next();
});

async function buildPromptCustomizationPayload(): Promise<PromptCustomizationPayload> {
  const overrides = await getPromptCustomizationOverrides(promptCustomizationKeys);
  const effectiveContents = Object.fromEntries(
    promptCustomizationKeys.map((key) => [key, getPromptCustomizationContent(key, overrides)]),
  ) as Record<PromptCustomizationKey, string>;

  return {
    items: promptCustomizationKeys.map((key) => ({
      key,
      content: effectiveContents[key],
      source: overrides[key] ? ("override" as const) : ("default" as const),
      updatedAt: overrides[key]?.updatedAt.toISOString() ?? null,
    })),
  };
}

promptsRoute.get("/", async (context) => {
  return context.json({
    code: 0,
    data: await buildPromptCustomizationPayload(),
    message: "ok",
  });
});

promptsRoute.put("/:key", async (context) => {
  const keyResult = promptCustomizationKeySchema.safeParse(context.req.param("key"));
  if (!keyResult.success) {
    return context.json({ code: 400, data: null, message: "未知的提示词配置项" }, 400);
  }

  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    return context.json({ code: 400, data: null, message: "invalid JSON body" }, 400);
  }

  const inputResult = promptCustomizationInputSchema.safeParse(body);
  if (!inputResult.success) {
    return context.json(
      {
        code: 400,
        data: null,
        message: inputResult.error.issues[0]?.message ?? "提示词内容无效",
      },
      400,
    );
  }

  await savePromptCustomization(keyResult.data, inputResult.data.content);

  return context.json({
    code: 0,
    data: await buildPromptCustomizationPayload(),
    message: "ok",
  });
});

promptsRoute.delete("/:key", async (context) => {
  const keyResult = promptCustomizationKeySchema.safeParse(context.req.param("key"));
  if (!keyResult.success) {
    return context.json({ code: 400, data: null, message: "未知的提示词配置项" }, 400);
  }

  await deletePromptCustomization(keyResult.data);

  return context.json({
    code: 0,
    data: await buildPromptCustomizationPayload(),
    message: "ok",
  });
});
