import type { h, Session } from "@satorijs/core";
import { buildMessageImageDescriptionSystemPrompt, generateStructuredOutput } from "@yuiju/utils";
import { getVisionModel } from "@yuiju/utils/llm/models";
import { Output } from "ai";
import { z } from "zod";
import { imageCacheState } from "@/state/image-cache";
import { stickerState } from "@/state/sticker";
import { logger } from "@/utils/logger";

export async function resolveSatoriImageDescriptions(
  elements: h[],
  session?: Session,
): Promise<Array<string | undefined>> {
  const descriptions = new Array<string | undefined>(elements.length);
  const pendingImages = new Map<
    string,
    {
      summary: string;
      data: string | ArrayBuffer | Buffer;
      mediaType: string;
      indexes: number[];
    }
  >();

  for (const [index, element] of elements.entries()) {
    const attrs = element.attrs as Record<string, any>;
    const summary = typeof attrs.summary === "string" ? attrs.summary.trim() : "";
    const stickerDescription = summary ? stickerState.getByKey(summary)?.description : undefined;
    if (stickerDescription) {
      descriptions[index] = stickerDescription;
      continue;
    }

    const file = String(attrs.file || attrs.url || attrs.src || "");
    const cachedDescription = file ? imageCacheState.get(file) : null;
    if (cachedDescription) {
      descriptions[index] = cachedDescription;
      continue;
    }

    const imageUrl = String(attrs.url || attrs.src || "").trim();
    if (!imageUrl || imageUrl.startsWith("base64://")) {
      descriptions[index] = summary;
      continue;
    }

    const pendingImage = pendingImages.get(file);
    if (pendingImage) {
      pendingImage.indexes.push(index);
      continue;
    }

    let data: string | ArrayBuffer | Buffer = imageUrl;
    let mediaType = "image";

    if (imageUrl.startsWith("internal:lark/")) {
      try {
        const downloadedFile = await session!.bot.ctx.http.file(imageUrl);
        data = downloadedFile.data;
        if (downloadedFile.mime) {
          mediaType = downloadedFile.mime;
        }
      } catch (error: any) {
        logger.warn("[message.image] 飞书图片下载失败", error?.message);
        descriptions[index] = summary;
        continue;
      }
    }

    pendingImages.set(file, {
      summary,
      data,
      mediaType,
      indexes: [index],
    });
  }

  if (!pendingImages.size) {
    return descriptions;
  }

  const images = [...pendingImages.values()];

  try {
    const result = await generateStructuredOutput({
      model: getVisionModel(),
      providerOptions: {
        vision: {
          enable_thinking: false,
        },
      },
      instructions: buildMessageImageDescriptionSystemPrompt(),
      messages: [
        {
          role: "user",
          content: images.flatMap((image, index) => [
            {
              type: "text" as const,
              text: `图片 ${index + 1} summary: ${image.summary}`,
            },
            {
              type: "file" as const,
              data: image.data,
              mediaType: image.mediaType,
            },
          ]),
        },
      ],
      output: Output.object({
        schema: z.object({
          descriptions: z
            .array(z.string().trim().min(1).max(100))
            .length(images.length)
            .describe("你为各图片生成的中文描述，顺序必须与图片编号一致"),
        }),
      }),
    });

    for (const [imageIndex, [file, image]] of [...pendingImages.entries()].entries()) {
      const description = result.output.descriptions[imageIndex];
      imageCacheState.set(file, description);
      for (const elementIndex of image.indexes) {
        descriptions[elementIndex] = description;
      }
    }
  } catch (error: any) {
    logger.warn("[message.image] Satori 图片描述生成失败，降级为 summary", error?.message);
    for (const image of pendingImages.values()) {
      for (const elementIndex of image.indexes) {
        descriptions[elementIndex] = image.summary;
      }
    }
  }

  return descriptions;
}
