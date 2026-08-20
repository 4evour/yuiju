import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/zh-cn";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { getYuijuConfig } from "./config/config";

dayjs.locale("zh-cn");
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 按项目配置时区格式化时间。
 *
 * 说明：
 * - 项目内凡是给 LLM 或用户展示的本地时间，都应优先复用该函数；
 * - 时区统一来自 yuiju.config.json，避免不同包各自读取或写死时区。
 */
export function formatProjectTime(input: Date | string | Dayjs, format: string): string {
  return dayjs(input).tz(getYuijuConfig().app.timezone).format(format);
}

/**
 * 按项目配置时区严格解析时间字符串。
 *
 * 说明：
 * - 用于解析来自工具入参或配置项的“项目本地时间”字符串；
 * - 解析失败时返回 undefined，便于上游按无效输入处理。
 */
export function parseProjectTime(value: string, format: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  // 先做严格格式校验，再按项目时区解释这组本地时间分量，避免把无效输入吞掉。
  const strictParsed = dayjs(value, format, true);
  if (!strictParsed.isValid()) {
    return undefined;
  }

  const parsed = dayjs.tz(strictParsed.format(format), format, getYuijuConfig().app.timezone);
  return parsed.toDate();
}

/**
 *
 * Get formatted time with weekday
 */
export function getTimeWithWeekday(time?: Dayjs, format?: string) {
  const displayTime = time ?? dayjs();

  return `${displayTime.format(format || "YYYY-MM-DD HH:mm")} ${displayTime.format("dddd")}`;
}
