import { type IWorldState, isDev, saveMemoryEpisode, type WeatherSnapshot } from "@yuiju/utils";
import dayjs from "dayjs";
import { buildWeatherChangedEpisode } from "@/memory/episode-builder";
import { worldState } from "@/state/world-state";
import { logger } from "@/utils/logger";
import { WEATHER_PERIOD_HOURS } from "./constants";
import { generateWeatherSnapshot } from "./generator";
import { resolveWeatherPeriod, type WeatherPeriod } from "./time";

export interface WeatherSyncResult {
  currentWeather: WeatherSnapshot;
  generatedPeriodCount: number;
  episodeCount: number;
  reusedCurrentPeriod: boolean;
}

interface SyncWeatherOptions {
  now?: Date;
  state?: Pick<IWorldState, "getWeather" | "setWeather">;
  emitEpisode?: typeof saveMemoryEpisode;
  isDev?: boolean;
}

let activeWeatherSync: Promise<WeatherSyncResult> | null = null;

/**
 * 校正并同步当前时间片天气。
 *
 * 说明：
 * - 启动校正与 cron 触发共用同一套逻辑；
 * - 通过模块级锁避免并发执行时重复补算、重复写 episode。
 */
export async function syncCurrentWeather(
  options: SyncWeatherOptions = {},
): Promise<WeatherSyncResult> {
  if (activeWeatherSync) {
    return activeWeatherSync;
  }

  activeWeatherSync = doSyncCurrentWeather(options).finally(() => {
    activeWeatherSync = null;
  });

  return activeWeatherSync;
}

async function doSyncCurrentWeather(options: SyncWeatherOptions): Promise<WeatherSyncResult> {
  const now = options.now ?? new Date();
  const state = options.state ?? worldState;
  const emitEpisode = options.emitEpisode ?? saveMemoryEpisode;
  const devFlag = options.isDev ?? isDev();
  const currentPeriod = resolveWeatherPeriod(now);
  const storedWeather = state.getWeather();

  if (storedWeather && isCurrentPeriodSnapshot(storedWeather, currentPeriod)) {
    logger.info("[weather] current weather is already valid", {
      weather: storedWeather,
    });
    return {
      currentWeather: storedWeather,
      generatedPeriodCount: 0,
      episodeCount: 0,
      reusedCurrentPeriod: true,
    };
  }

  const previousWeather = sanitizePreviousWeather(storedWeather, now);
  const periodsToGenerate = collectPeriodsToGenerate(previousWeather, currentPeriod);
  let latestWeather = previousWeather;
  let finalWeather: WeatherSnapshot | null = null;
  let episodeCount = 0;

  for (const period of periodsToGenerate) {
    const nextWeather = generateWeatherSnapshot({
      period,
      previousWeather: latestWeather,
      updatedAt: isCurrentPeriod(period, currentPeriod)
        ? now.toISOString()
        : period.startAt.toISOString(),
    });

    const weatherEpisode = buildWeatherChangedEpisode({
      before: latestWeather,
      after: nextWeather,
      isDev: devFlag,
    });
    if (weatherEpisode) {
      await emitEpisode(weatherEpisode);
      episodeCount += 1;
    }

    latestWeather = nextWeather;
    finalWeather = nextWeather;
  }

  if (!finalWeather) {
    finalWeather = generateWeatherSnapshot({
      period: currentPeriod,
      previousWeather: null,
      updatedAt: now.toISOString(),
    });
  }

  await state.setWeather(finalWeather);

  logger.info("[weather] synchronized current weather", {
    weather: finalWeather,
    generatedPeriodCount: periodsToGenerate.length,
    episodeCount,
  });

  return {
    currentWeather: finalWeather,
    generatedPeriodCount: periodsToGenerate.length,
    episodeCount,
    reusedCurrentPeriod: false,
  };
}

/**
 * 把缓存中的天气快照收敛成“可用于继续补算”的上一片天气。
 *
 * 说明：
 * - 当前周期命中时会在主流程直接复用，这里只处理过期快照与异常未来快照；
 * - 未来快照说明状态已经脏掉，直接丢弃并从当前周期重算更直观可靠。
 */
function sanitizePreviousWeather(
  snapshot: WeatherSnapshot | null,
  now: Date,
): WeatherSnapshot | null {
  if (!snapshot) {
    return null;
  }

  if (dayjs(snapshot.periodStartAt).isAfter(now)) {
    logger.warn("[weather] future weather snapshot detected, regenerate current period", {
      weather: snapshot,
      now: now.toISOString(),
    });
    return null;
  }

  return snapshot;
}

function isCurrentPeriodSnapshot(snapshot: WeatherSnapshot, period: WeatherPeriod): boolean {
  return (
    snapshot.periodStartAt === period.startAt.toISOString() &&
    snapshot.periodEndAt === period.endAt.toISOString()
  );
}

function isCurrentPeriod(period: WeatherPeriod, currentPeriod: WeatherPeriod): boolean {
  return period.startAt.isSame(currentPeriod.startAt);
}

/**
 * 根据上一片天气推导出需要补算的所有时间片。
 *
 * 说明：
 * - 没有历史天气时，直接生成当前时间片；
 * - 有历史天气时，从上一片结束时间一路补到当前时间片，避免启动后丢失过渡天气。
 */
function collectPeriodsToGenerate(
  previousWeather: WeatherSnapshot | null,
  currentPeriod: WeatherPeriod,
) {
  if (!previousWeather) {
    return [currentPeriod];
  }

  const periods: WeatherPeriod[] = [];
  let cursor = dayjs(previousWeather.periodEndAt);

  while (cursor.isBefore(currentPeriod.endAt)) {
    periods.push(resolveWeatherPeriod(cursor));
    cursor = cursor.add(WEATHER_PERIOD_HOURS, "hour");
  }

  if (periods.length === 0) {
    periods.push(currentPeriod);
  }

  return periods;
}
