import "@yuiju/utils/env";
import process from "node:process";
import { connectDB } from "@yuiju/utils";
import { startRealtimeLoop } from "@/engine/runner";
import { worldRunner } from "@/engine/world";
import { logger } from "@/utils/logger";
import { initState } from "./state";

async function main() {
  await connectDB();
  await initState();
  await worldRunner.start();

  process.on("uncaughtException", (err) => {
    logger.error({
      event: "process.uncaughtException",
      error: String(err),
      stack: (err as any)?.stack,
    });
  });
  process.on("unhandledRejection", (reason) => {
    console.log(reason);
    logger.error({ event: "process.unhandledRejection", error: String(reason) });
  });

  logger.info("[main] Starting realtime loop...");
  await startRealtimeLoop();
}

main();
