"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_CONTROL_MODE_REGISTRY_KEY, type GameControlMode } from "./game/control-mode";
import styles from "./game-scene.module.css";

export function GameScene() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | undefined>(undefined);
  const controlModeRef = useRef<GameControlMode>("map");
  const [controlMode, setControlMode] = useState<GameControlMode>("map");

  useEffect(() => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) {
      return;
    }

    let isUnmounted = false;

    void import("./game/create-game").then(({ createGame }) => {
      if (isUnmounted) {
        return;
      }
      gameRef.current = createGame(gameContainer, controlModeRef.current);
    });

    return () => {
      isUnmounted = true;
      gameRef.current?.destroy(true);
      gameRef.current = undefined;
    };
  }, []);

  const changeControlMode = (nextControlMode: GameControlMode) => {
    controlModeRef.current = nextControlMode;
    setControlMode(nextControlMode);
    gameRef.current?.registry.set(GAME_CONTROL_MODE_REGISTRY_KEY, nextControlMode);
  };

  return (
    <section className={styles.frame} aria-label="月汐海岸游戏场景">
      <fieldset className={styles.controlMode}>
        <legend className="sr-only">游戏控制模式</legend>
        <button
          type="button"
          aria-pressed={controlMode === "map"}
          className={controlMode === "map" ? styles.activeControlModeButton : undefined}
          onClick={() => changeControlMode("map")}
        >
          控制地图
        </button>
        <button
          type="button"
          aria-pressed={controlMode === "character"}
          className={controlMode === "character" ? styles.activeControlModeButton : undefined}
          onClick={() => changeControlMode("character")}
        >
          控制角色
        </button>
      </fieldset>
      <div ref={gameContainerRef} className={styles.gameContainer} />
    </section>
  );
}
