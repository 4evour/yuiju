import {
  connectSyncDB,
  createYuijuLogger,
  getMemoryEpisodeModel,
  setYuijuLogger,
} from "@yuiju/utils";

setYuijuLogger(
  createYuijuLogger({
    logDir: "./logs",
  }),
);

export async function main() {
  const syncConnection = await connectSyncDB();
  if (!syncConnection) {
    throw new Error("yuiju.config.ts 中的 database.syncMongoUri 未配置");
  }

  try {
    const memoryEpisodeModel = await getMemoryEpisodeModel("sync");
    const result = await memoryEpisodeModel.deleteMany({ source: "chat" }).exec();

    console.log(`已从 sync MongoDB 的 memory_episode 删除 ${result.deletedCount} 条聊天记录`);
  } finally {
    await syncConnection.close();
  }
}
