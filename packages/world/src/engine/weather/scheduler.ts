import { getYuijuConfig } from "@yuiju/utils/config/config";
import cron, { type ScheduledTask } from "node-cron";
import { logger } from "@/utils/logger";
import { WEATHER_CRON_EXPRESSION } from "./constants";
import { syncCurrentWeather } from "./service";

/**
 * 注册天气定时任务。
 *
 * 说明：
 * - cron 只负责调度，不承载天气领域逻辑；
 * - 真正的校正与补算全部复用 syncCurrentWeather，避免启动链路与定时链路分叉。
 */
export function startWeatherScheduler(): ScheduledTask {
  const timezone = getYuijuConfig().app.timezone;

  return cron.schedule(
    WEATHER_CRON_EXPRESSION,
    () => {
      syncCurrentWeather().catch((error) => {
        logger.error("[weather] scheduled sync failed", error);
      });
    },
    {
      timezone,
    },
  );
}
