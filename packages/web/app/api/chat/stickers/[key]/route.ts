import { getWebChatSticker } from "@yuiju/message/web-chat";
import { getYuijuConfig } from "@yuiju/utils";
import { isPublicDeployment } from "@/lib/public-deployment";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  if (isPublicDeployment() || !getYuijuConfig().message.web.enabled) {
    return new Response(null, { status: 404 });
  }

  const { key } = await context.params;
  const sticker = await getWebChatSticker(key);
  if (!sticker) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(sticker.fileBuffer), {
    headers: {
      "cache-control": "private, max-age=86400",
      "content-type": sticker.contentType,
    },
  });
}
