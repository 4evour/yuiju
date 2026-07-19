import process from "node:process";
import { isDev } from "@yuiju/utils";
import { recoverRunningAction, runNextAction } from "./action-lifecycle";

let running = false;
let stopped = false;

process.on("SIGINT", () => {
  stopped = true;
  process.exit();
});
process.on("SIGTERM", () => {
  stopped = true;
  process.exit();
});

/**
 * Realtime engine 主循环入口。
 *
 * runner 只负责启动和循环调度：
 * - 生产环境启动时先恢复 Redis 中未完成的 action；
 * - 开发环境启动时跳过首次恢复，避免重启后立刻结算残留 action；
 * - 之后持续推进下一次 Action 生命周期；
 * - 具体的 action 选择、运行态写入、等待和完成结算都在 action-lifecycle 中完成。
 */
export async function startRealtimeLoop() {
  stopped = false;
  if (running) return;
  running = true;

  try {
    let eventDescription = isDev() ? undefined : await recoverRunningAction();

    while (!stopped) {
      eventDescription = await runNextAction(eventDescription);
    }
  } finally {
    running = false;
  }
}
