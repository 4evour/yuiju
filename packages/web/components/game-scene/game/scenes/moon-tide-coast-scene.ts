import Phaser from "phaser";
import idleSpriteSheet from "../../assets/character/sprite-sheets/character.png";
import walkDownSpriteSheet from "../../assets/character/sprite-sheets/walk-down.png";
import walkLeftSpriteSheet from "../../assets/character/sprite-sheets/walk-left.png";
import walkRightSpriteSheet from "../../assets/character/sprite-sheets/walk-right.png";
import walkUpSpriteSheet from "../../assets/character/sprite-sheets/walk-up.png";
import moonTideCoast from "../../assets/scenes/moon-tide-coast@2x.webp";
import { GAME_CONTROL_MODE_REGISTRY_KEY } from "../control-mode";

const SCENE_TEXTURE_KEY = "moon-tide-coast";
const CHARACTER_IDLE_TEXTURE_KEY = "character-idle";
const CHARACTER_WALK_DOWN_TEXTURE_KEY = "character-walk-down";
const CHARACTER_WALK_LEFT_TEXTURE_KEY = "character-walk-left";
const CHARACTER_WALK_RIGHT_TEXTURE_KEY = "character-walk-right";
const CHARACTER_WALK_UP_TEXTURE_KEY = "character-walk-up";
const CHARACTER_IDLE_ANIMATION_KEY = "character-idle-animation";
const CHARACTER_WALK_DOWN_ANIMATION_KEY = "character-walk-down-animation";
const CHARACTER_WALK_LEFT_ANIMATION_KEY = "character-walk-left-animation";
const CHARACTER_WALK_RIGHT_ANIMATION_KEY = "character-walk-right-animation";
const CHARACTER_WALK_UP_ANIMATION_KEY = "character-walk-up-animation";
const SCENE_WIDTH = 1376;
const SCENE_HEIGHT = 768;
const CHARACTER_X = 304;
const CHARACTER_Y = 400;
const CHARACTER_FRAME_SIZE = 128;
const CHARACTER_BASELINE = 125;
const CHARACTER_SCALE = 2 / 3;
const CAMERA_MOVE_SPEED = 320;
const CHARACTER_MOVE_SPEED = 64;

export class MoonTideCoastScene extends Phaser.Scene {
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private readonly cameraMovement = new Phaser.Math.Vector2();
  private readonly characterMovement = new Phaser.Math.Vector2();
  private character!: Phaser.GameObjects.Sprite;
  private draggingPointerId: number | null = null;
  private dragStartPointerX = 0;
  private dragStartPointerY = 0;
  private dragStartScrollX = 0;
  private dragStartScrollY = 0;

  constructor() {
    super("moon-tide-coast");
  }

  preload() {
    this.load.image(SCENE_TEXTURE_KEY, moonTideCoast.src);
    this.load.spritesheet(CHARACTER_IDLE_TEXTURE_KEY, idleSpriteSheet.src, {
      frameWidth: CHARACTER_FRAME_SIZE,
      frameHeight: CHARACTER_FRAME_SIZE,
    });
    this.load.spritesheet(CHARACTER_WALK_DOWN_TEXTURE_KEY, walkDownSpriteSheet.src, {
      frameWidth: CHARACTER_FRAME_SIZE,
      frameHeight: CHARACTER_FRAME_SIZE,
    });
    this.load.spritesheet(CHARACTER_WALK_LEFT_TEXTURE_KEY, walkLeftSpriteSheet.src, {
      frameWidth: CHARACTER_FRAME_SIZE,
      frameHeight: CHARACTER_FRAME_SIZE,
    });
    this.load.spritesheet(CHARACTER_WALK_RIGHT_TEXTURE_KEY, walkRightSpriteSheet.src, {
      frameWidth: CHARACTER_FRAME_SIZE,
      frameHeight: CHARACTER_FRAME_SIZE,
    });
    this.load.spritesheet(CHARACTER_WALK_UP_TEXTURE_KEY, walkUpSpriteSheet.src, {
      frameWidth: CHARACTER_FRAME_SIZE,
      frameHeight: CHARACTER_FRAME_SIZE,
    });
  }

  create() {
    this.add.image(0, 0, SCENE_TEXTURE_KEY).setOrigin(0).setDisplaySize(SCENE_WIDTH, SCENE_HEIGHT);

    this.anims.create({
      key: CHARACTER_IDLE_ANIMATION_KEY,
      frames: this.anims.generateFrameNumbers(CHARACTER_IDLE_TEXTURE_KEY, {
        start: 0,
        end: 2,
      }),
      frameRate: 2,
      repeat: -1,
      yoyo: true,
    });

    this.anims.create({
      key: CHARACTER_WALK_DOWN_ANIMATION_KEY,
      frames: this.anims.generateFrameNumbers(CHARACTER_WALK_DOWN_TEXTURE_KEY, {
        start: 0,
        end: 2,
      }),
      frameRate: 2,
      repeat: -1,
    });

    this.anims.create({
      key: CHARACTER_WALK_LEFT_ANIMATION_KEY,
      frames: this.anims.generateFrameNumbers(CHARACTER_WALK_LEFT_TEXTURE_KEY, {
        start: 0,
        end: 3,
      }),
      frameRate: 2,
      repeat: -1,
    });

    this.anims.create({
      key: CHARACTER_WALK_RIGHT_ANIMATION_KEY,
      frames: this.anims.generateFrameNumbers(CHARACTER_WALK_RIGHT_TEXTURE_KEY, {
        start: 0,
        end: 3,
      }),
      frameRate: 2,
      repeat: -1,
    });

    this.anims.create({
      key: CHARACTER_WALK_UP_ANIMATION_KEY,
      frames: this.anims.generateFrameNumbers(CHARACTER_WALK_UP_TEXTURE_KEY, {
        start: 0,
        end: 2,
      }),
      frameRate: 2,
      repeat: -1,
    });

    this.character = this.add
      .sprite(CHARACTER_X, CHARACTER_Y, CHARACTER_IDLE_TEXTURE_KEY)
      .setOrigin(0.5, CHARACTER_BASELINE / CHARACTER_FRAME_SIZE)
      .setScale(CHARACTER_SCALE);
    this.character.play(CHARACTER_IDLE_ANIMATION_KEY);

    this.cameras.main.setBounds(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(this.character.x, this.character.y - 32);

    const keyboard = this.input.keyboard!;
    this.cursorKeys = keyboard.createCursorKeys();
    this.movementKeys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (
        this.registry.get(GAME_CONTROL_MODE_REGISTRY_KEY) !== "map" ||
        !pointer.wasTouch ||
        this.draggingPointerId !== null
      ) {
        return;
      }

      this.draggingPointerId = pointer.id;
      this.dragStartPointerX = pointer.x;
      this.dragStartPointerY = pointer.y;
      this.dragStartScrollX = this.cameras.main.scrollX;
      this.dragStartScrollY = this.cameras.main.scrollY;
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (
        this.registry.get(GAME_CONTROL_MODE_REGISTRY_KEY) !== "map" ||
        pointer.id !== this.draggingPointerId ||
        !pointer.isDown
      ) {
        return;
      }

      this.cameras.main.setScroll(
        this.dragStartScrollX - (pointer.x - this.dragStartPointerX) / this.cameras.main.zoom,
        this.dragStartScrollY - (pointer.y - this.dragStartPointerY) / this.cameras.main.zoom,
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

    if (this.registry.get(GAME_CONTROL_MODE_REGISTRY_KEY) === "character") {
      if (horizontalDirection === 0 && verticalDirection === 0) {
        this.character.play(CHARACTER_IDLE_ANIMATION_KEY, true);
        return;
      }

      this.characterMovement
        .set(horizontalDirection, verticalDirection)
        .normalize()
        .scale((CHARACTER_MOVE_SPEED * delta) / 1000);
      this.character.x += this.characterMovement.x;
      this.character.y += this.characterMovement.y;

      let characterAnimationKey: string;
      if (horizontalDirection < 0) {
        characterAnimationKey = CHARACTER_WALK_LEFT_ANIMATION_KEY;
      } else if (horizontalDirection > 0) {
        characterAnimationKey = CHARACTER_WALK_RIGHT_ANIMATION_KEY;
      } else if (verticalDirection < 0) {
        characterAnimationKey = CHARACTER_WALK_UP_ANIMATION_KEY;
      } else {
        characterAnimationKey = CHARACTER_WALK_DOWN_ANIMATION_KEY;
      }
      this.character.play(characterAnimationKey, true);
      return;
    }

    this.character.play(CHARACTER_IDLE_ANIMATION_KEY, true);

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
