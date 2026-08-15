"use client";

import { useEffect, useState } from "react";
import walkDownSpriteSheet from "@/components/game-scene/assets/character/sprite-sheets/walk-down.png";
import walkRightSpriteSheet from "@/components/game-scene/assets/character/sprite-sheets/walk-right.png";
import walkUpSpriteSheet from "@/components/game-scene/assets/character/sprite-sheets/walk-up.png";
import { GameScene } from "@/components/game-scene/game-scene";

const directionAnimations = [
  { direction: "向下", frameCount: 3, spriteSheet: walkDownSpriteSheet },
  { direction: "向右", frameCount: 4, spriteSheet: walkRightSpriteSheet },
  { direction: "向上", frameCount: 3, spriteSheet: walkUpSpriteSheet },
];

export default function GameDevPage() {
  const [animationTick, setAnimationTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAnimationTick((currentAnimationTick) => currentAnimationTick + 1);
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="min-h-[calc(100vh-77px)] bg-[linear-gradient(180deg,#f2ead7_0%,#e7d9bd_100%)] px-[18px] py-[28px]">
      <div className="mx-auto grid max-w-[1040px] justify-items-center gap-[18px]">
        <header className="font-fusion-pixel text-center text-[#493247]">
          <p className="text-[14px] tracking-[0.22em] text-[#7b665d]">游戏场景开发预览</p>
          <h1 className="mt-[6px] text-[28px]">月汐海岸</h1>
        </header>
        <GameScene />
        <section className="grid justify-items-center gap-[10px] text-[#493247]">
          <h2 className="font-fusion-pixel text-[18px]">浏览器直接渲染</h2>
          <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-4">
            {directionAnimations.map(({ direction, frameCount, spriteSheet }) => {
              const spriteSheetWidth = frameCount * 128;

              return (
                <figure
                  key={direction}
                  className="grid justify-items-center gap-[6px] rounded-[8px] border-2 border-[#493247] bg-[#d9b879] p-[12px]"
                >
                  <div className="h-[128px] w-[128px] overflow-hidden">
                    <img
                      src={spriteSheet.src}
                      width={spriteSheetWidth}
                      height={128}
                      alt={`${direction}行走动画`}
                      className="block h-[128px] max-w-none [image-rendering:pixelated]"
                      style={{
                        width: spriteSheetWidth,
                        transform: `translateX(-${(animationTick % frameCount) * 128}px)`,
                      }}
                    />
                  </div>
                  <figcaption className="font-fusion-pixel text-[14px]">{direction}</figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
