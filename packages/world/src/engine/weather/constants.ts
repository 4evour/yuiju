import type { TemperatureLevel, WeatherType } from "@yuiju/utils/types/weather";

/**
 * 天气定时任务的 cron 表达式。
 *
 * 说明：
 * - 每天固定在 00:00 / 06:00 / 12:00 / 18:00 执行；
 * - 第一版世界时间与真实时间一致，因此直接按真实时钟调度。
 */
export const WEATHER_CRON_EXPRESSION = "0 0,6,12,18 * * *";

/**
 * 单个天气时间片长度（小时）。
 */
export const WEATHER_PERIOD_HOURS = 6;

type WeightedWeatherMap = Record<WeatherType, number>;
type WeightedTemperatureMap = Record<TemperatureLevel, number>;

/**
 * 不同季节的基础天气权重。
 */
export const MONTHLY_WEATHER_WEIGHTS: Record<
  "spring" | "summer" | "autumn" | "winter",
  WeightedWeatherMap
> = {
  spring: { 晴: 24, 多云: 26, 阴: 20, 小雨: 16, 雨: 10, 雷雨: 1, 雪: 0, 雾: 3 },
  summer: { 晴: 22, 多云: 18, 阴: 15, 小雨: 14, 雨: 16, 雷雨: 11, 雪: 0, 雾: 4 },
  autumn: { 晴: 28, 多云: 20, 阴: 20, 小雨: 12, 雨: 8, 雷雨: 2, 雪: 0, 雾: 10 },
  winter: { 晴: 18, 多云: 12, 阴: 24, 小雨: 6, 雨: 6, 雷雨: 0, 雪: 24, 雾: 10 },
};

/**
 * 不同季节的基础体感温度权重。
 */
export const MONTHLY_TEMPERATURE_WEIGHTS: Record<
  "spring" | "summer" | "autumn" | "winter",
  WeightedTemperatureMap
> = {
  spring: { 严寒: 2, 寒冷: 18, 清凉: 36, 舒适: 34, 温暖: 10, 炎热: 0 },
  summer: { 严寒: 0, 寒冷: 0, 清凉: 10, 舒适: 28, 温暖: 22, 炎热: 40 },
  autumn: { 严寒: 0, 寒冷: 8, 清凉: 28, 舒适: 42, 温暖: 20, 炎热: 2 },
  winter: { 严寒: 35, 寒冷: 40, 清凉: 20, 舒适: 5, 温暖: 0, 炎热: 0 },
};

/**
 * 天气惯性修正表。
 *
 * 说明：
 * - key 格式为 “上一天气->当前候选天气”；
 * - 未显式声明的组合默认修正为 0。
 */
export const WEATHER_INERTIA_ADJUSTMENTS: Record<string, number> = {
  "晴->晴": 25,
  "多云->多云": 25,
  "阴->阴": 25,
  "小雨->小雨": 24,
  "雨->雨": 25,
  "雷雨->雷雨": 18,
  "雪->雪": 25,
  "雾->雾": 16,
  "晴->多云": 14,
  "多云->晴": 14,
  "多云->阴": 14,
  "阴->多云": 14,
  "阴->小雨": 12,
  "小雨->阴": 12,
  "小雨->雨": 12,
  "雨->小雨": 12,
  "雨->雷雨": 10,
  "雷雨->雨": 10,
  "阴->雾": 10,
  "雾->阴": 10,
  "多云->雾": 8,
  "雾->多云": 8,
  "阴->雪": 10,
  "雪->阴": 10,
  "小雨->雪": 6,
  "雪->小雨": 6,
  "晴->阴": 4,
  "阴->晴": 4,
  "晴->小雨": -4,
  "小雨->晴": -2,
  "晴->雨": -10,
  "雨->晴": -8,
  "晴->雷雨": -16,
  "雷雨->晴": -12,
  "晴->雪": -20,
  "雪->晴": -18,
};
