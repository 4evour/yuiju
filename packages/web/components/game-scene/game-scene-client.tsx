"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import type Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import { CHARACTER_ATLAS } from "./game/character/character-animation-constant";
import { createGame } from "./game/create-game";
import {
  GAME_ACTIVE_SCENE_CHANGE_EVENT,
  type GameSceneKey,
  MOON_TIDE_COAST_SCENE_KEY,
  WORLD_MAP_SCENE_KEY,
} from "./game/scene";
import { MoonTideCoastUi } from "./game/scenes/moon-tide-coast/moon-tide-coast-ui";
import { WorldMapUi } from "./game/scenes/world-map/world-map-ui";
import styles from "./game-scene.module.css";

const GAME_ASPECT_RATIO_WIDTH = 16;
const GAME_ASPECT_RATIO_HEIGHT = 9;

export function GameSceneClient() {
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Phaser.Game>();
  const [activeSceneKey, setActiveSceneKey] = useState<GameSceneKey>();
  const [renderFps, setRenderFps] = useState<number>();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) {
      return;
    }

    let createdGame: Phaser.Game | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let disposed = false;
    const characterAtlasImage = new Image();
    characterAtlasImage.src = CHARACTER_ATLAS.source;

    Promise.all([
      document.fonts.load('10px "Fusion Pixel 10px Proportional"'),
      characterAtlasImage.decode(),
    ]).then(() => {
      if (disposed) {
        return;
      }

      resizeObserver = new ResizeObserver(([entry]) => {
        const gameWidth = Math.floor(entry.contentRect.width);
        if (gameWidth === 0) {
          return;
        }

        const gameHeight = Math.round(
          (gameWidth * GAME_ASPECT_RATIO_HEIGHT) / GAME_ASPECT_RATIO_WIDTH,
        );
        if (createdGame) {
          createdGame.scale.resize(gameWidth, gameHeight);
          return;
        }

        createdGame = createGame(gameContainer, gameWidth, gameHeight);
        createdGame.events.on(GAME_ACTIVE_SCENE_CHANGE_EVENT, setActiveSceneKey);
        setGame(createdGame);
      });
      resizeObserver.observe(gameContainer);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (!createdGame) {
        return;
      }

      createdGame.events.off(GAME_ACTIVE_SCENE_CHANGE_EVENT, setActiveSceneKey);
      createdGame.destroy(true);
    };
  }, []);

  useEffect(() => {
    if (!game) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRenderFps(Math.round(game.loop.actualFps));
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [game]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenContainerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const fullscreenContainer = fullscreenContainerRef.current!;
    if (document.fullscreenElement === fullscreenContainer) {
      await document.exitFullscreen();
      return;
    }

    await fullscreenContainer.requestFullscreen();
  };

  return (
    <div ref={fullscreenContainerRef} className={styles.fullscreenContainer}>
      <section
        className={styles.frame}
        aria-label={activeSceneKey === MOON_TIDE_COAST_SCENE_KEY ? "月汐海岸游戏场景" : "世界地图"}
      >
        {game && activeSceneKey === MOON_TIDE_COAST_SCENE_KEY ? (
          <MoonTideCoastUi game={game} />
        ) : null}
        {game && activeSceneKey === WORLD_MAP_SCENE_KEY ? <WorldMapUi game={game} /> : null}
        {renderFps !== undefined ? <span className={styles.fps}>FPS {renderFps}</span> : null}
        <button
          type="button"
          className={styles.fullscreenButton}
          aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        </button>
        <div ref={gameContainerRef} className={styles.gameContainer} />
      </section>
    </div>
  );
}
