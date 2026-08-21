import type { HomeResponse } from "@/app/api/nodejs/[[...route]]/home";

export const HOME_SUMMARY_ENDPOINT = "/api/nodejs/home/summary";

export async function fetchHomeSummary(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`获取首页状态失败：${response.status}`);
  }

  const payload = (await response.json()) as HomeResponse;
  return payload.data;
}
