import { createHash } from "node:crypto";
import { formatProjectTime } from "@yuiju/utils/time";
import type { TemperatureLevel, WeatherSnapshot, WeatherType } from "@yuiju/utils/types/weather";
import {
  MONTHLY_TEMPERATURE_WEIGHTS,
  MONTHLY_WEATHER_WEIGHTS,
  WEATHER_INERTIA_ADJUSTMENTS,
} from "./constants";
import type { WeatherPeriod } from "./time";

type Season = "spring" | "summer" | "autumn" | "winter";
type Rng = () => number;
type WeightedMap<TValue extends string> = Record<TValue, number>;

const SUMMER_FESTIVAL_DATE = "2026-08-15";

export interface GenerateWeatherSnapshotInput {
  period: WeatherPeriod;
  previousWeather: WeatherSnapshot | null;
  updatedAt: string;
}

/**
 * 生成指定时间片的天气快照。
 *
 * 说明：
 * - 生成过程完全由“时间片 + 上一片天气”决定，保证补算时可复现；
 * - 当前函数只负责纯计算，不涉及任何状态写入与副作用。
 */
export function generateWeatherSnapshot(input: GenerateWeatherSnapshotInput): WeatherSnapshot {
  const range = createDeterministicRange(
    buildWeatherSeed(input.period.startAt.toISOString(), input.previousWeather),
  );
  const season = resolveSeason(input.period.month);
  const weatherType =
    formatProjectTime(input.period.startAt, "YYYY-MM-DD") === SUMMER_FESTIVAL_DATE
      ? "晴"
      : generateWeatherType(season, input.previousWeather?.type, range);
  const temperatureLevel = generateTemperatureLevel(input.period.month, weatherType, range);

  return {
    type: weatherType,
    temperatureLevel,
    periodStartAt: input.period.startAt.toISOString(),
    periodEndAt: input.period.endAt.toISOString(),
    updatedAt: input.updatedAt,
  };
}

function resolveSeason(month: number): Season {
  if (month >= 3 && month <= 5) {
    return "spring";
  }

  if (month >= 6 && month <= 8) {
    return "summer";
  }

  if (month >= 9 && month <= 11) {
    return "autumn";
  }

  return "winter";
}

function generateWeatherType(
  season: Season,
  previousType: WeatherType | undefined,
  rng: Rng,
): WeatherType {
  const weightedWeatherMap = { ...MONTHLY_WEATHER_WEIGHTS[season] };

  if (previousType) {
    for (const currentType of Object.keys(weightedWeatherMap) as WeatherType[]) {
      const transitionKey = `${previousType}->${currentType}`;
      weightedWeatherMap[currentType] = Math.max(
        0,
        weightedWeatherMap[currentType] + (WEATHER_INERTIA_ADJUSTMENTS[transitionKey] ?? 0),
      );
    }
  }

  // 惯性修正可能把被季节禁用的天气重新抬回来，因此在抽样前做最终兜底。
  applySeasonWeatherConstraints(season, weightedWeatherMap);

  return pickWeightedValue(weightedWeatherMap, rng);
}

/**
 * 对天气候选做季节级硬约束。
 *
 * 说明：
 * - 只有冬天允许下雪，避免基础权重或天气惯性把结果拉向违和场景；
 * - 冬季不生成雷雨，尽量保持天气观感稳定且符合常识；
 * - 这里只放“世界观级别”的硬规则，和具体概率调优分开，便于后续继续扩展。
 */
function applySeasonWeatherConstraints(
  season: Season,
  weightedWeatherMap: WeightedMap<WeatherType>,
): void {
  if (season !== "winter") {
    weightedWeatherMap.雪 = 0;
  }

  if (season === "winter") {
    weightedWeatherMap.雷雨 = 0;
  }
}

function generateTemperatureLevel(
  month: number,
  weatherType: WeatherType,
  rng: Rng,
): TemperatureLevel {
  const season = resolveSeason(month);
  const weightedTemperatureMap = { ...MONTHLY_TEMPERATURE_WEIGHTS[season] };

  applyWeatherTemperatureAdjustments(season, weatherType, weightedTemperatureMap);

  return pickWeightedValue(weightedTemperatureMap, rng);
}

/**
 * 根据天气类型微调体感温度权重。
 *
 * 说明：
 * - 体感温度先使用季节基础分布，再叠加天气带来的偏移；
 * - 这里优先保证“观感自然”，而不是追求精确气象建模。
 */
function applyWeatherTemperatureAdjustments(
  season: Season,
  weatherType: WeatherType,
  weightedTemperatureMap: WeightedMap<TemperatureLevel>,
): void {
  switch (weatherType) {
    case "晴": {
      if (season === "summer") {
        weightedTemperatureMap.严寒 = 0;
        weightedTemperatureMap.寒冷 = 0;
        weightedTemperatureMap.温暖 += 18;
        weightedTemperatureMap.炎热 += 28;
      } else if (season === "winter") {
        weightedTemperatureMap.舒适 = 0;
        weightedTemperatureMap.温暖 = 0;
        weightedTemperatureMap.炎热 = 0;
        weightedTemperatureMap.严寒 += 10;
        weightedTemperatureMap.寒冷 += 15;
      } else {
        weightedTemperatureMap.舒适 += 6;
        weightedTemperatureMap.温暖 += 4;
      }
      break;
    }

    case "多云": {
      if (season === "summer") {
        weightedTemperatureMap.严寒 = 0;
        weightedTemperatureMap.寒冷 = 0;
        weightedTemperatureMap.温暖 += 10;
        weightedTemperatureMap.炎热 += 12;
      } else if (season === "winter") {
        weightedTemperatureMap.温暖 = 0;
        weightedTemperatureMap.炎热 = 0;
        weightedTemperatureMap.舒适 = Math.max(0, weightedTemperatureMap.舒适 - 4);
        weightedTemperatureMap.寒冷 += 8;
      } else {
        weightedTemperatureMap.舒适 += 6;
      }
      break;
    }

    case "阴": {
      if (season === "winter") {
        weightedTemperatureMap.温暖 = 0;
        weightedTemperatureMap.炎热 = 0;
        weightedTemperatureMap.严寒 += 6;
        weightedTemperatureMap.寒冷 += 10;
      } else if (season === "summer") {
        weightedTemperatureMap.炎热 = Math.max(0, weightedTemperatureMap.炎热 - 8);
        weightedTemperatureMap.舒适 += 4;
      } else {
        weightedTemperatureMap.清凉 += 4;
      }
      break;
    }

    case "雾": {
      weightedTemperatureMap.炎热 = 0;
      weightedTemperatureMap.温暖 = Math.max(0, weightedTemperatureMap.温暖 - 10);
      weightedTemperatureMap.清凉 += 18;
      if (season === "winter") {
        weightedTemperatureMap.严寒 += 8;
      } else {
        weightedTemperatureMap.舒适 += 4;
      }
      break;
    }

    case "小雨": {
      weightedTemperatureMap.炎热 = 0;
      weightedTemperatureMap.温暖 = Math.max(0, weightedTemperatureMap.温暖 - 12);
      weightedTemperatureMap.清凉 += 12;
      weightedTemperatureMap.寒冷 += season === "winter" ? 10 : 4;
      break;
    }

    case "雨": {
      weightedTemperatureMap.炎热 = 0;
      weightedTemperatureMap.温暖 = Math.max(0, weightedTemperatureMap.温暖 - 18);
      weightedTemperatureMap.舒适 = Math.max(0, weightedTemperatureMap.舒适 - 8);
      weightedTemperatureMap.清凉 += 14;
      weightedTemperatureMap.寒冷 += season === "winter" ? 12 : 6;
      break;
    }

    case "雷雨": {
      weightedTemperatureMap.炎热 = 0;
      weightedTemperatureMap.温暖 = Math.max(0, weightedTemperatureMap.温暖 - 20);
      weightedTemperatureMap.舒适 = Math.max(0, weightedTemperatureMap.舒适 - 10);
      weightedTemperatureMap.清凉 += 18;
      weightedTemperatureMap.寒冷 += season === "summer" ? 4 : 8;
      break;
    }

    case "雪": {
      weightedTemperatureMap.清凉 = 0;
      weightedTemperatureMap.舒适 = 0;
      weightedTemperatureMap.温暖 = 0;
      weightedTemperatureMap.炎热 = 0;
      weightedTemperatureMap.严寒 += 30;
      weightedTemperatureMap.寒冷 += 20;
      break;
    }
  }
}

function pickWeightedValue<TValue extends string>(
  weightedMap: WeightedMap<TValue>,
  rng: Rng,
): TValue {
  const normalizedEntries: Array<[TValue, number]> = Object.entries(weightedMap).map(
    ([value, weight]) => [value as TValue, Math.max(0, Number(weight))],
  );
  const totalWeight = normalizedEntries.reduce((sum, [, weight]) => sum + weight, 0);

  if (totalWeight <= 0) {
    return normalizedEntries[0][0];
  }

  let cursor = rng() * totalWeight;

  for (const [value, weight] of normalizedEntries) {
    cursor -= weight;
    if (cursor < 0) {
      return value;
    }
  }

  return normalizedEntries[normalizedEntries.length - 1][0];
}

function buildWeatherSeed(periodStartAt: string, previousWeather: WeatherSnapshot | null): string {
  return [
    periodStartAt,
    previousWeather?.periodStartAt ?? "none",
    previousWeather?.type ?? "none",
    previousWeather?.temperatureLevel ?? "none",
  ].join("|");
}

/**
 * 基于稳定 seed 生成伪随机数。
 *
 * 说明：
 * - 使用哈希把任意字符串收敛成 uint32 初始种子；
 * - mulberry32 足够轻量，且对当前天气权重抽样场景已经足够稳定。
 */
function createDeterministicRange(seed: string): Rng {
  const hash = createHash("sha256").update(seed).digest("hex");
  let state = Number.parseInt(hash.slice(0, 8), 16) || 1;

  return () => {
    state += 0x6d2b79f5;
    let temp = state;
    temp = Math.imul(temp ^ (temp >>> 15), temp | 1);
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), temp | 61);
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296;
  };
}
