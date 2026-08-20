import { getYuijuConfig } from "@yuiju/utils/config/config";
import dayjs, { type Dayjs } from "dayjs";
import { WEATHER_PERIOD_HOURS } from "./constants";

export interface WeatherPeriod {
  startAt: Dayjs;
  endAt: Dayjs;
  month: number;
  slotHour: 0 | 6 | 12 | 18;
}

const HOUR_IN_MS = 60 * 60 * 1000;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * 读取项目时区下的本地时间部件。
 *
 * 说明：
 * - weather 只需要“项目时区里的年月日时”，因此把时区处理集中在本文件；
 * - 继续使用 Intl + IANA 时区，避免把 Asia/Shanghai 这类固定偏移写死。
 */
function readProjectLocalTime(input: Date) {
  const formatter = getProjectTimezoneFormatter();
  const parts = formatter.formatToParts(input);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getProjectTimezoneFormatter(): Intl.DateTimeFormat {
  const timezone = getYuijuConfig().app.timezone;
  const cachedFormatter = formatterCache.get(timezone);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timezone, formatter);
  return formatter;
}

/**
 * 把“项目时区内的本地整点”换算成真实 UTC 时间戳。
 *
 * 说明：
 * - 这里使用小步迭代收敛 offset，兼容存在 DST 的时区；
 * - weather 的时间片边界依赖这个结果，因此统一从这里生成开始时间。
 */
function resolveProjectHourStartTimestamp(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
}) {
  const naiveUtcTimestamp = Date.UTC(input.year, input.month - 1, input.day, input.hour, 0, 0, 0);
  let resolvedTimestamp = naiveUtcTimestamp;

  for (let index = 0; index < 3; index += 1) {
    const offsetMs = resolveProjectTimezoneOffsetMs(new Date(resolvedTimestamp));
    const nextTimestamp = naiveUtcTimestamp - offsetMs;

    if (nextTimestamp === resolvedTimestamp) {
      break;
    }

    resolvedTimestamp = nextTimestamp;
  }

  return resolvedTimestamp;
}

function resolveProjectTimezoneOffsetMs(input: Date): number {
  const localTime = readProjectLocalTime(input);
  const projectedTimestamp = Date.UTC(
    localTime.year,
    localTime.month - 1,
    localTime.day,
    localTime.hour,
    localTime.minute,
    localTime.second,
    0,
  );

  return projectedTimestamp - input.getTime();
}

/**
 * 解析给定时间所属的天气时间片。
 */
export function resolveWeatherPeriod(input: Date | Dayjs | string): WeatherPeriod {
  const baseTime = dayjs(input);
  const localTime = readProjectLocalTime(baseTime.toDate());
  const slotHour = (Math.floor(localTime.hour / WEATHER_PERIOD_HOURS) * WEATHER_PERIOD_HOURS) as
    | 0
    | 6
    | 12
    | 18;

  const startTimestamp = resolveProjectHourStartTimestamp({
    year: localTime.year,
    month: localTime.month,
    day: localTime.day,
    hour: slotHour,
  });
  const endTimestamp = startTimestamp + WEATHER_PERIOD_HOURS * HOUR_IN_MS;

  return {
    startAt: dayjs(startTimestamp),
    endAt: dayjs(endTimestamp),
    month: localTime.month,
    slotHour,
  };
}
