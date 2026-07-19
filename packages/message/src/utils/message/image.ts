import type { h, Session } from "@satorijs/core";
import { buildMessageImageDescriptionSystemPrompt, visionModel } from "@yuiju/utils";
import { generateText } from "ai";
import { imageCacheState } from "@/state/image-cache";
import { stickerState } from "@/state/sticker";
import { logger } from "@/utils/logger";
export async function resolveSatoriImageDescription(
  element: h,
  session?: Session,
): Promise<string | undefined> {
  const attrs = element.attrs as Record<string, any>;
  const summary = typeof attrs.summary === "string" ? attrs.summary.trim() : "";
  const stickerDescription = summary ? stickerState.getByKey(summary)?.description : undefined;
  if (stickerDescription) {
    return stickerDescription;
  }

  const file = String(attrs.file || attrs.url || attrs.src || "");
  const cachedDescription = file ? imageCacheState.get(file) : undefined;
  if (cachedDescription) {
    return cachedDescription;
  }

  const generatedDescription = await generateSatoriImageDescription(element, session);
  if (file && generatedDescription) {
    imageCacheState.set(file, generatedDescription);
    return generatedDescription;
  }

  return summary;
}

async function generateSatoriImageDescription(
  element: h,
  session?: Session,
): Promise<string | null> {
  const attrs = element.attrs as Record<string, unknown>;
  const imageUrl = String(attrs.url || attrs.src || "").trim();
  if (!imageUrl || imageUrl.startsWith("base64://")) {
    return null;
  }

  const summary = typeof attrs.summary === "string" ? attrs.summary.trim() : "";
  let image: string | ArrayBuffer | Buffer = imageUrl;
  let mediaType: string | undefined;

  if (imageUrl.startsWith("internal:lark/")) {
    try {
      const file = await session!.bot.ctx.http.file(imageUrl);
      image = file.data;
      mediaType = file.mime;
    } catch (error: any) {
      logger.warn("[message.image] 飞书图片下载失败", error?.message);
      return null;
    }
  }

  try {
    const result = await generateText({
      model: visionModel,
      providerOptions: {
        vision: {
          enable_thinking: false,
        },
      },
      instructions: buildMessageImageDescriptionSystemPrompt(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `summary: ${summary}`,
            },
            {
              type: "image",
              image,
              mediaType,
            },
          ],
        },
      ],
    });

    const description = result.text.trim();
    return description || null;
  } catch (error: any) {
    logger.warn("[message.image] Satori 图片描述生成失败，降级为 summary", error?.message);
    return null;
  }
}
