"use client";

import { useEffect, useState } from "react";
import { GameScene } from "@/components/game-scene/game-scene";

export default function GameDevPage() {
  const [animationTick, setAnimationTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAnimationTick((currentAnimationTick) => currentAnimationTick + 1);
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-[linear-gradient(180deg,#f2ead7_0%,#e7d9bd_100%)] px-[18px] py-[28px] md:min-h-screen">
      <div className="mx-auto grid max-w-[1040px] justify-items-center gap-[18px]">
        <GameScene />
      </div>
    </main>
  );
}
