import Phaser from "phaser";
import { CHARACTER_ANIMATION, CHARACTER_ATLAS } from "../../character/character-animation-constant";
import { WORLD_MAP_SCENE_KEY } from "../../scene";

const PRELOAD_SCENE_KEY = "preload";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(PRELOAD_SCENE_KEY);
  }

  preload() {
    this.load.atlas(CHARACTER_ATLAS.textureKey, CHARACTER_ATLAS.source, CHARACTER_ATLAS.meta);
  }

  create() {
    for (const animation of Object.values(CHARACTER_ANIMATION)) {
      this.anims.create({
        key: animation.key,
        frames: animation.frames.map((frame) => ({
          key: CHARACTER_ATLAS.textureKey,
          frame,
        })),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
        yoyo: animation.yoyo,
        skipMissedFrames: animation.skipMissedFrames,
      });
    }

    this.scene.start(WORLD_MAP_SCENE_KEY);
  }
}
