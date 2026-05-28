import LarkBot from "@satorijs/adapter-lark";
import { Context, HTTP } from "@satorijs/core";
import OneBotBot from "@yuiju/satorijs-adapter-onebot";
import { connectDB, getYuijuConfig, initializePersonMemoryHeat } from "@yuiju/utils";
import { groupMessageHandler } from "./handler/group-message";
import { privateMessageHandler } from "./handler/private-message";
import { startMessageInternalApi } from "./internal-api";
import { stickerState } from "./state/sticker";
import { logger } from "./utils/logger";
import { normalizeSatoriSession } from "./utils/satori/session";

const config = getYuijuConfig();
const satori = new Context({});
satori.plugin(HTTP);

const lark = new LarkBot(satori, {
  ...config.message.lark,
});

const onebot = new OneBotBot(satori, {
  ...config.message.onebot,
});

satori.on("message", async (session) => {
  try {
    const normalizedSession = await normalizeSatoriSession(session);

    if (normalizedSession.subtype === "private") {
      await privateMessageHandler(normalizedSession);
      return;
    }

    if (normalizedSession.guildId && normalizedSession.channelId) {
      await groupMessageHandler(normalizedSession);
    }
  } catch (error) {
    logger.error("[message.server] 处理消息事件失败", error);
  }
});

async function main() {
  await connectDB();
  // 初始化人物记忆
  await initializePersonMemoryHeat();
  // 初始化表情
  await stickerState.initialize();
  startMessageInternalApi({ onebot, lark });
  await satori.start();
  logger.info("[message.server] 消息服务启动完成");
}

main();
