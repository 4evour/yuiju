"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { HomeResponse } from "./api/nodejs/[[...route]]/home";
import { HomeMapCard } from "./home/home-map-card";
import { HomePageHeader } from "./home/home-page-header";
import { HomeStatusCard } from "./home/home-status-card";
import { HomeWorldCard } from "./home/home-world-card";

export default function HomePage() {
  const { data: homeData, isLoading } = useSWR("/api/nodejs/home/summary", async () => {
    try {
      const response = await fetch("/api/nodejs/home/summary", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as HomeResponse;
        return payload.data ?? undefined;
      }
    } catch {
      return;
    }
  });

  const summary = useMemo(() => {
    return homeData?.status?.location && homeData?.status?.behavior
      ? `悠酱现在在【${homeData.status.location}】，正在【${homeData.status.behavior}】`
      : undefined;
  }, [homeData]);

  const status = useMemo(() => {
    return homeData?.status;
  }, [homeData]);

  const plans = useMemo(() => {
    return homeData?.plans;
  }, [homeData]);

  return (
    <main className="max-w-300 mx-auto px-[18px] pt-[18px] pb-[36px]">
      <HomePageHeader summary={summary} />

      <div className="grid grid-cols-[360px_1fr] max-[1020px]:grid-cols-1 gap-[14px] items-start">
        <div className="grid gap-[14px]">
          <HomeStatusCard
            status={status}
            todayActions={homeData?.todayActions}
            inventory={homeData?.inventory}
            plans={plans}
          />
          <HomeWorldCard time={homeData?.world?.time} weather={homeData?.world?.weather} />
        </div>

        <HomeMapCard location={homeData?.status?.location} />
      </div>
    </main>
  );
}
