import Phaser from "phaser";
import { GAME_CONTROL_MODE_REGISTRY_KEY, type GameControlMode } from "./control-mode";
import { MoonTideCoastScene } from "./scenes/moon-tide-coast-scene";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

export function createGame(parent: HTMLDivElement, initialControlMode: GameControlMode) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#d9b879",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    callbacks: {
      preBoot(game) {
        game.registry.set(GAME_CONTROL_MODE_REGISTRY_KEY, initialControlMode);
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [MoonTideCoastScene],
  });
}
