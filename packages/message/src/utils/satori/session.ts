import type { Session } from "@satorijs/core";
import { normalizeLarkSession } from "./lark";

export async function normalizeSatoriSession(session: Session): Promise<Session> {
  if (session.platform === "lark" || session.platform === "feishu") {
    return normalizeLarkSession(session);
  }

  if (
    session.type === "notice" &&
    session.platform === "onebot" &&
    session.subtype === "poke" &&
    (session as any).targetId === session.selfId
  ) {
    session.messageId = `poke:${session.platform}:${session.id}`;
    session.content = "戳了悠酱一下";

    if (session.guildId) {
      session.subtype = "group";
      session.isDirect = false;
    } else if (session.userId) {
      session.subtype = "private";
      session.channelId = `private:${session.userId}`;
      session.isDirect = true;
    }
  }

  return session;
}
