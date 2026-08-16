import type { MajorScene } from "@yuiju/utils/types/state";
import Phaser from "phaser";
import worldMap from "../../../assets/scenes/world-map.webp";
import { CHARACTER_ANIMATION, CHARACTER_ATLAS } from "../../character/character-animation-constant";
import { GAME_ACTIVE_SCENE_CHANGE_EVENT, WORLD_MAP_SCENE_KEY } from "../../scene";
import {
  WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT,
  WORLD_MAP_MESSAGE_EVENT,
  WORLD_MAP_REGIONS,
  WORLD_MAP_TAP_MAX_DISTANCE,
} from "./world-map-constant";

const WORLD_MAP_TEXTURE_KEY = "world-map";
const WORLD_MAP_WIDTH = 1376;
const WORLD_MAP_HEIGHT = 768;
const CAMERA_MOVE_SPEED = 320;

export class WorldMapScene extends Phaser.Scene {
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private readonly cameraMovement = new Phaser.Math.Vector2();
  private draggingPointerId: number | null = null;
  private dragStartPointerX = 0;
  private dragStartPointerY = 0;
  private dragStartScrollX = 0;
  private dragStartScrollY = 0;

  constructor() {
    super(WORLD_MAP_SCENE_KEY);
  }

  preload() {
    this.load.image(WORLD_MAP_TEXTURE_KEY, worldMap.src);
  }

  create() {
    this.game.events.emit(GAME_ACTIVE_SCENE_CHANGE_EVENT, WORLD_MAP_SCENE_KEY);
    this.cameras.main.fadeIn(200, 73, 50, 71);
    this.add.image(0, 0, WORLD_MAP_TEXTURE_KEY).setOrigin(0);

    const characterMarker = this.add
      .sprite(0, 0, CHARACTER_ATLAS.textureKey, CHARACTER_ANIMATION.worldMapMarker.frames[0])
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);
    const updateCharacterMarker = (majorScene: MajorScene) => {
      const region = WORLD_MAP_REGIONS.find((region) => region.majorScene === majorScene)!;
      characterMarker.setPosition(region.labelX, region.labelY);
      if (!characterMarker.visible) {
        characterMarker.setVisible(true).play(CHARACTER_ANIMATION.worldMapMarker.key);
      }
    };

    this.game.events.on(WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT, updateCharacterMarker);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT, updateCharacterMarker);
    });

    for (const region of WORLD_MAP_REGIONS) {
      const label = this.add
        .text(region.labelX, region.labelY, region.name, {
          color: "#493247",
          fontFamily: '"Fusion Pixel 12px Proportional", sans-serif',
          fontSize: "16px",
          stroke: "#fff9ea",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 1)
        .setDepth(1);
      const interaction = this.add
        .zone(
          region.interactionX,
          region.interactionY,
          region.interactionWidth,
          region.interactionHeight,
        )
        .setInteractive({ useHandCursor: true });

      interaction.on(Phaser.Input.Events.POINTER_OVER, () => {
        label.setColor("#fff9ea").setStroke("#493247", 2);
      });
      interaction.on(Phaser.Input.Events.POINTER_OUT, () => {
        label.setColor("#493247").setStroke("#fff9ea", 2);
      });
      interaction.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDistance() > WORLD_MAP_TAP_MAX_DISTANCE) {
          return;
        }

        if (region.secondarySceneKey === null) {
          this.game.events.emit(WORLD_MAP_MESSAGE_EVENT);
          return;
        }

        this.input.enabled = false;
        this.cameras.main.fadeOut(200, 73, 50, 71);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(region.secondarySceneKey);
        });
      });
    }

    this.cameras.main.setBounds(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);
    this.cameras.main.centerOn(WORLD_MAP_WIDTH / 2, WORLD_MAP_HEIGHT / 2);

    const keyboard = this.input.keyboard!;
    this.cursorKeys = keyboard.createCursorKeys();
    this.movementKeys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch || this.draggingPointerId !== null) {
        return;
      }

      this.draggingPointerId = pointer.id;
      this.dragStartPointerX = pointer.x;
      this.dragStartPointerY = pointer.y;
      this.dragStartScrollX = this.cameras.main.scrollX;
      this.dragStartScrollY = this.cameras.main.scrollY;
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.draggingPointerId || !pointer.isDown) {
        return;
      }

      this.cameras.main.setScroll(
        this.dragStartScrollX - (pointer.x - this.dragStartPointerX),
        this.dragStartScrollY - (pointer.y - this.dragStartPointerY),
      );
    });

    const stopDragging = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.draggingPointerId) {
        this.draggingPointerId = null;
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, stopDragging);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, stopDragging);
  }

  update(_time: number, delta: number) {
    const horizontalDirection =
      Number(this.cursorKeys.right.isDown || this.movementKeys.right.isDown) -
      Number(this.cursorKeys.left.isDown || this.movementKeys.left.isDown);
    const verticalDirection =
      Number(this.cursorKeys.down.isDown || this.movementKeys.down.isDown) -
      Number(this.cursorKeys.up.isDown || this.movementKeys.up.isDown);

    if (horizontalDirection === 0 && verticalDirection === 0) {
      return;
    }

    this.cameraMovement
      .set(horizontalDirection, verticalDirection)
      .normalize()
      .scale((CAMERA_MOVE_SPEED * delta) / 1000);
    this.cameras.main.scrollX += this.cameraMovement.x;
    this.cameras.main.scrollY += this.cameraMovement.y;
  }
}
