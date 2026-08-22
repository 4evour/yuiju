import Phaser from "phaser";
import { CHARACTER_MOVE_SPEED_MULTIPLIER_REGISTRY_KEY } from "./character/character-movement-speed";
import {
  CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY,
  GAME_CONTROL_MODE_REGISTRY_KEY,
  INITIAL_CAMERA_FOLLOW_CHARACTER,
  INITIAL_GAME_CONTROL_MODE,
} from "./scenes/moon-tide-coast/control-mode";
import { MoonTideCoastScene } from "./scenes/moon-tide-coast/moon-tide-coast-scene";
import { PreloadScene } from "./scenes/preload/preload-scene";
import { WorldMapScene } from "./scenes/world-map/world-map-scene";

export function createGame(
  parent: HTMLDivElement,
  width: number,
  height: number,
  characterMoveSpeedMultiplier: number,
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#d9b879",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        debugShowBody: true,
        debugShowStaticBody: true,
        debugShowVelocity: true,
      },
    },
    callbacks: {
      preBoot(game) {
        game.registry.set(
          CHARACTER_MOVE_SPEED_MULTIPLIER_REGISTRY_KEY,
          characterMoveSpeedMultiplier,
        );
        game.registry.set(GAME_CONTROL_MODE_REGISTRY_KEY, INITIAL_GAME_CONTROL_MODE);
        game.registry.set(CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY, INITIAL_CAMERA_FOLLOW_CHARACTER);
      },
    },
    scale: {
      mode: Phaser.Scale.NONE,
      width,
      height,
    },
    scene: [PreloadScene, WorldMapScene, MoonTideCoastScene],
  });
}
