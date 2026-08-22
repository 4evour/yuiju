import type { TemperatureLevel, WeatherSnapshot, WeatherType } from "@yuiju/utils/types/weather";

const MORNING_MOOD_BASE = 55;

interface MorningMoodFactorDefinition {
  description: string;
  delta: number;
}

const WEATHER_MOOD_FACTORS = {
  晴: { description: "晴朗天气", delta: 5 },
  多云: { description: "多云天气", delta: 2 },
  阴: { description: "阴沉天气", delta: -2 },
  小雨: { description: "小雨天气", delta: 0 },
  雨: { description: "下雨天气", delta: -4 },
  雷雨: { description: "雷雨天气", delta: -8 },
  雪: { description: "下雪天气", delta: 3 },
  雾: { description: "有雾天气", delta: -1 },
} satisfies Record<WeatherType, MorningMoodFactorDefinition>;

const TEMPERATURE_MOOD_FACTORS = {
  严寒: { description: "严寒体感", delta: -6 },
  寒冷: { description: "寒冷体感", delta: -3 },
  清凉: { description: "清凉体感", delta: 1 },
  舒适: { description: "舒适体感", delta: 4 },
  温暖: { description: "温暖体感", delta: 2 },
  炎热: { description: "炎热体感", delta: -5 },
} satisfies Record<TemperatureLevel, MorningMoodFactorDefinition>;

export interface MorningMoodFactor {
  source: "weather" | "temperature" | "day-type";
  value: string;
  description: string;
  delta: number;
}

export interface MorningMoodResult {
  baseMood: number;
  factors: MorningMoodFactor[];
  primaryReasons: string[];
  value: number;
}

interface ResolveMorningMoodInput {
  weather: Pick<WeatherSnapshot, "type" | "temperatureLevel">;
  isWeekend: boolean;
}

export function resolveMorningMood(input: ResolveMorningMoodInput): MorningMoodResult {
  const weatherFactor = WEATHER_MOOD_FACTORS[input.weather.type];
  const temperatureFactor = TEMPERATURE_MOOD_FACTORS[input.weather.temperatureLevel];
  const factors: MorningMoodFactor[] = [
    {
      source: "weather",
      value: input.weather.type,
      ...weatherFactor,
    },
    {
      source: "temperature",
      value: input.weather.temperatureLevel,
      ...temperatureFactor,
    },
    {
      source: "day-type",
      value: input.isWeekend ? "周末" : "非周末",
      description: input.isWeekend ? "周末" : "非周末",
      delta: input.isWeekend ? 3 : 0,
    },
  ];

  return {
    baseMood: MORNING_MOOD_BASE,
    factors,
    primaryReasons: factors
      .filter((factor) => factor.delta !== 0)
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
      .slice(0, 2)
      .map((factor) => factor.description),
    value: MORNING_MOOD_BASE + factors.reduce((total, factor) => total + factor.delta, 0),
  };
}
