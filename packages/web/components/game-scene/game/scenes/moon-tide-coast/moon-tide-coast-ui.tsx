import type Phaser from "phaser";
import { useEffect, useState } from "react";
import { MOON_TIDE_COAST_SCENE_KEY } from "../../scene";
import {
  CAMERA_FOLLOW_CHARACTER_REGISTRY_EVENT,
  CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY,
  GAME_CONTROL_MODE_REGISTRY_KEY,
  type GameControlMode,
} from "./control-mode";
import type { MoonTideCoastScene } from "./moon-tide-coast-scene";
import styles from "./moon-tide-coast-ui.module.css";

interface MoonTideCoastUiProps {
  game: Phaser.Game;
}

export function MoonTideCoastUi({ game }: MoonTideCoastUiProps) {
  const [controlMode, setControlMode] = useState<GameControlMode>(
    game.registry.get(GAME_CONTROL_MODE_REGISTRY_KEY),
  );
  const [collisionDebugVisible, setCollisionDebugVisible] = useState(true);
  const [cameraFollowEnabled, setCameraFollowEnabled] = useState<boolean>(
    game.registry.get(CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY),
  );

  useEffect(() => {
    const handleCameraFollowChange = (_parent: Phaser.Game, enabled: boolean) => {
      setCameraFollowEnabled(enabled);
    };
    game.registry.events.on(CAMERA_FOLLOW_CHARACTER_REGISTRY_EVENT, handleCameraFollowChange);
    return () => {
      game.registry.events.off(CAMERA_FOLLOW_CHARACTER_REGISTRY_EVENT, handleCameraFollowChange);
    };
  }, [game]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const scene = game.scene.getScene(MOON_TIDE_COAST_SCENE_KEY) as MoonTideCoastScene;
      scene.setCollisionDebugVisible(collisionDebugVisible);
    }
  }, [collisionDebugVisible, game]);

  const changeControlMode = (nextControlMode: GameControlMode) => {
    setControlMode(nextControlMode);
    game.registry.set(GAME_CONTROL_MODE_REGISTRY_KEY, nextControlMode);
  };

  const returnToWorldMap = () => {
    const scene = game.scene.getScene(MOON_TIDE_COAST_SCENE_KEY) as MoonTideCoastScene;
    scene.returnToWorldMap();
  };

  const changeCameraFollow = (enabled: boolean) => {
    const scene = game.scene.getScene(MOON_TIDE_COAST_SCENE_KEY) as MoonTideCoastScene;
    scene.setCameraFollowEnabled(enabled);
  };

  return (
    <>
      <button type="button" className={styles.backButton} onClick={returnToWorldMap}>
        返回地图
      </button>
      <div className={styles.sceneControls}>
        <label className={styles.switchControl}>
          <span>相机跟随角色</span>
          <input
            type="checkbox"
            checked={cameraFollowEnabled}
            onChange={(event) => changeCameraFollow(event.target.checked)}
          />
          <i aria-hidden="true" />
        </label>
        {process.env.NODE_ENV === "development" ? (
          <>
            <label className={styles.switchControl}>
              <span>控制角色</span>
              <input
                type="checkbox"
                checked={controlMode === "character"}
                onChange={(event) => changeControlMode(event.target.checked ? "character" : "map")}
              />
              <i aria-hidden="true" />
            </label>
            <label className={styles.switchControl}>
              <span>显示碰撞信息</span>
              <input
                type="checkbox"
                checked={collisionDebugVisible}
                onChange={(event) => setCollisionDebugVisible(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </>
        ) : null}
      </div>
    </>
  );
}
