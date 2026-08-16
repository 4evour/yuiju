"use client";

import dynamic from "next/dynamic";

export const GameScene = dynamic(
  () => import("./game-scene-client").then(({ GameSceneClient }) => GameSceneClient),
  { ssr: false },
);
