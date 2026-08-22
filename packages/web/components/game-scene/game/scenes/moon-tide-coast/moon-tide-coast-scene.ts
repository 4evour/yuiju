import Phaser from "phaser";
import moonTideCoast from "../../../assets/scenes/moon-tide-coast@2x.webp";
import moonTideCoastRegions from "../../../assets/scenes/moon-tide-coast-regions.json";
import {
  CHARACTER_ANIMATION,
  CHARACTER_ATLAS,
  CHARACTER_FRAME_SIZE,
  CHARACTER_WINK_ANIMATION_KEYS,
} from "../../character/character-animation-constant";
import { CharacterAutoWander } from "../../character/character-auto-wander";
import {
  CHARACTER_MOVE_SPEED,
  CHARACTER_MOVE_SPEED_MULTIPLIER_REGISTRY_KEY,
} from "../../character/character-movement-speed";
import { GridPathfinder } from "../../navigation/grid-pathfinder";
import {
  GAME_ACTIVE_SCENE_CHANGE_EVENT,
  MOON_TIDE_COAST_SCENE_KEY,
  WORLD_MAP_SCENE_KEY,
} from "../../scene";
import type { SceneRegionDocument } from "../../scene-region";
import {
  CHARACTER_IDLE_SPEECHES,
  CHARACTER_SPEECH_CHECK_DELAY_MAX,
  CHARACTER_SPEECH_CHECK_DELAY_MIN,
  CHARACTER_SPEECH_DISPLAY_DURATION,
  CHARACTER_SPEECH_TRIGGER_PROBABILITY,
} from "./character-speech-constant";
import {
  CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY,
  GAME_CONTROL_MODE_REGISTRY_KEY,
} from "./control-mode";

const SCENE_TEXTURE_KEY = "moon-tide-coast";
const SCENE_WIDTH = 1376;
const SCENE_HEIGHT = 768;
const CHARACTER_BASELINE = 125;
const CHARACTER_SCALE = 2 / 3;

// 角色碰撞体使用 128px 精灵帧内的源像素，运行时会随 CHARACTER_SCALE 一起缩放。
// 宽度覆盖角色双脚，较薄的高度让碰撞位置集中在脚下。
const CHARACTER_COLLISION_WIDTH = 50;
const CHARACTER_COLLISION_HEIGHT = 10;

// 碰撞体水平居中，并让底边与角色基线重合。
const CHARACTER_COLLISION_OFFSET_X = (CHARACTER_FRAME_SIZE - CHARACTER_COLLISION_WIDTH) / 2;
const CHARACTER_COLLISION_OFFSET_Y = CHARACTER_BASELINE - CHARACTER_COLLISION_HEIGHT;
// 出生点记录碰撞体中心，角色精灵使用脚底基线定位，因此需要补上半个碰撞体高度。
const CHARACTER_SPAWN_BASELINE_OFFSET_Y = (CHARACTER_COLLISION_HEIGHT * CHARACTER_SCALE) / 2;
// 阴影相对角色基线向下偏移的场景逻辑像素。
const CHARACTER_SHADOW_OFFSET_Y = 2;
// 气泡尖角相对角色脚底基线向上的距离，按角色实际可见高度设置，单位为场景逻辑像素。
const CHARACTER_SPEECH_OFFSET_Y = 72;
// 气泡主体与尖角的尺寸，单位为场景逻辑像素。
const CHARACTER_SPEECH_BUBBLE_WIDTH = 112;
const CHARACTER_SPEECH_BUBBLE_HEIGHT = 24;
const CHARACTER_SPEECH_BUBBLE_TAIL_HEIGHT = 5;
// Phaser Graphics 使用的气泡填充色与描边色。
const CHARACTER_SPEECH_BACKGROUND_COLOR = 0xfff9ea;
const CHARACTER_SPEECH_BORDER_COLOR = 0x493247;
// 手动移动相机的速度，单位为场景逻辑像素/秒。
const CAMERA_MOVE_SPEED = 320;
const CAMERA_ZOOM = 1.5;
// 相机跟随时让角色显示在画面中心下方，单位为场景逻辑像素。
const CAMERA_FOLLOW_OFFSET_Y = 32;
// 每帧向角色位置靠近的比例；越接近 1，跟随响应越快。
const CAMERA_FOLLOW_LERP = 0.08;
// EasyStar 寻路网格的单格边长，单位为场景逻辑像素。
const NAVIGATION_CELL_SIZE = 16;
// 随机目的地与角色当前位置之间允许的最短直线距离。
const CHARACTER_WANDER_MINIMUM_DESTINATION_DISTANCE = 96;
// 一次移动结束后的随机待机区间，单位为毫秒。
const CHARACTER_WANDER_IDLE_DURATION_MIN = 15000;
const CHARACTER_WANDER_IDLE_DURATION_MAX = 60000;

// 两次随机眨眼检查之间的时间范围，单位为毫秒。
const CHARACTER_WINK_MIN_DELAY = 3000;
const CHARACTER_WINK_MAX_DELAY = 8000;
// 开发模式下，寻路折线、普通节点和当前目标节点的调试颜色。
const NAVIGATION_DEBUG_LINE_COLOR = 0x6bd5e1;
const NAVIGATION_DEBUG_NODE_COLOR = 0xe8f4f6;
const NAVIGATION_DEBUG_TARGET_COLOR = 0xf2a65a;
const SCENE_REGIONS = moonTideCoastRegions as SceneRegionDocument;

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
  private characterMoveSpeed!: number;
  private character!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private characterAutoWander!: CharacterAutoWander;
  private characterShadow!: Phaser.GameObjects.Sprite;
  private characterSpeechBubble!: Phaser.GameObjects.Container;
  private characterSpeechText!: Phaser.GameObjects.Text;
  // 待机气泡分为“等待下一次概率判断”和“正在显示”两个计时阶段。
  private nextSpeechCheckAt: number | null = null;
  private speechVisibleUntil: number | null = null;
  private collisionDebugGraphic!: Phaser.GameObjects.Graphics;
  private navigationDebugGraphic!: Phaser.GameObjects.Graphics;
  private navigationDebugVisible = false;
  // 跟随开关是长期偏好；移动地图只临时暂停当前这一次移动的相机跟随。
  private cameraFollowSuspended = false;
  private suspendedMovementId = 0;
  private draggingPointerId: number | null = null;
  private dragStartPointerX = 0;
  private dragStartPointerY = 0;
  private dragStartScrollX = 0;
  private dragStartScrollY = 0;

  constructor() {
    super(MOON_TIDE_COAST_SCENE_KEY);
  }

  preload() {
    this.load.image(SCENE_TEXTURE_KEY, moonTideCoast.src);
  }

  create() {
    this.characterMoveSpeed =
      CHARACTER_MOVE_SPEED * this.registry.get(CHARACTER_MOVE_SPEED_MULTIPLIER_REGISTRY_KEY);
    this.game.events.emit(GAME_ACTIVE_SCENE_CHANGE_EVENT, MOON_TIDE_COAST_SCENE_KEY);
    this.cameras.main.fadeIn(200, 73, 50, 71);

    this.add.image(0, 0, SCENE_TEXTURE_KEY).setOrigin(0).setDisplaySize(SCENE_WIDTH, SCENE_HEIGHT);
    this.physics.world.setBounds(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    const pathfinder = new GridPathfinder({
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      cellSize: NAVIGATION_CELL_SIZE,
      actorWidth: CHARACTER_COLLISION_WIDTH * CHARACTER_SCALE,
      actorHeight: CHARACTER_COLLISION_HEIGHT * CHARACTER_SCALE,
      obstacles: SCENE_REGIONS.regions.map((region) => region.shape),
    });
    // 可行走点已经按角色碰撞体尺寸排除了障碍和地图边界，可以直接作为随机出生点。
    const spawnPoint =
      pathfinder.walkablePoints[Phaser.Math.Between(0, pathfinder.walkablePoints.length - 1)];
    const characterX = spawnPoint.x;
    const characterY = spawnPoint.y + CHARACTER_SPAWN_BASELINE_OFFSET_Y;

    this.characterShadow = this.add
      .sprite(
        characterX,
        characterY + CHARACTER_SHADOW_OFFSET_Y,
        CHARACTER_ATLAS.textureKey,
        CHARACTER_ANIMATION.shadow.frames[0],
      )
      .setScale(CHARACTER_SCALE)
      .setDepth(1);
    this.characterShadow.play(CHARACTER_ANIMATION.shadow.key);

    this.character = this.physics.add
      .sprite(
        characterX,
        characterY,
        CHARACTER_ATLAS.textureKey,
        CHARACTER_ANIMATION.idle.frames[0],
      )
      .setOrigin(0.5, CHARACTER_BASELINE / CHARACTER_FRAME_SIZE)
      .setScale(CHARACTER_SCALE)
      .setDepth(2)
      .setCollideWorldBounds(true);
    this.character.body
      .setSize(CHARACTER_COLLISION_WIDTH, CHARACTER_COLLISION_HEIGHT)
      .setOffset(CHARACTER_COLLISION_OFFSET_X, CHARACTER_COLLISION_OFFSET_Y);
    this.character.play(CHARACTER_ANIMATION.idle.key);
    this.scheduleNextWink();

    const speechBubbleBackground = this.add
      .graphics()
      .fillStyle(CHARACTER_SPEECH_BACKGROUND_COLOR, 0.96)
      .lineStyle(2, CHARACTER_SPEECH_BORDER_COLOR, 1)
      .fillRoundedRect(
        -CHARACTER_SPEECH_BUBBLE_WIDTH / 2,
        -CHARACTER_SPEECH_BUBBLE_HEIGHT - CHARACTER_SPEECH_BUBBLE_TAIL_HEIGHT,
        CHARACTER_SPEECH_BUBBLE_WIDTH,
        CHARACTER_SPEECH_BUBBLE_HEIGHT,
        6,
      )
      .strokeRoundedRect(
        -CHARACTER_SPEECH_BUBBLE_WIDTH / 2,
        -CHARACTER_SPEECH_BUBBLE_HEIGHT - CHARACTER_SPEECH_BUBBLE_TAIL_HEIGHT,
        CHARACTER_SPEECH_BUBBLE_WIDTH,
        CHARACTER_SPEECH_BUBBLE_HEIGHT,
        6,
      )
      .fillTriangle(
        -5,
        -CHARACTER_SPEECH_BUBBLE_TAIL_HEIGHT,
        5,
        -CHARACTER_SPEECH_BUBBLE_TAIL_HEIGHT,
        0,
        0,
      );
    this.characterSpeechText = this.add
      .text(0, -CHARACTER_SPEECH_BUBBLE_HEIGHT / 2 - CHARACTER_SPEECH_BUBBLE_TAIL_HEIGHT, "", {
        color: "#493247",
        fontFamily: '"Fusion Pixel 10px Proportional", sans-serif',
        fontSize: "10px",
      })
      .setOrigin(0.5);
    this.characterSpeechBubble = this.add
      .container(characterX, characterY - CHARACTER_SPEECH_OFFSET_Y, [
        speechBubbleBackground,
        this.characterSpeechText,
      ])
      .setDepth(4)
      .setScale(1 / CAMERA_ZOOM)
      .setVisible(false);

    const collisionBodies = this.physics.add.staticGroup(
      SCENE_REGIONS.regions.map((region) =>
        this.add.zone(
          region.shape.x + region.shape.width / 2,
          region.shape.y + region.shape.height / 2,
          region.shape.width,
          region.shape.height,
        ),
      ),
    );
    this.physics.add.collider(this.character, collisionBodies);
    this.characterAutoWander = new CharacterAutoWander(
      pathfinder,
      {
        speed: this.characterMoveSpeed,
        minimumDestinationDistance: CHARACTER_WANDER_MINIMUM_DESTINATION_DISTANCE,
        idleDurationMin: CHARACTER_WANDER_IDLE_DURATION_MIN,
        idleDurationMax: CHARACTER_WANDER_IDLE_DURATION_MAX,
      },
      this.time.now,
    );

    if (process.env.NODE_ENV === "development") {
      this.collisionDebugGraphic = this.physics.world.createDebugGraphic().setVisible(false);
      this.physics.world.drawDebug = false;
      this.navigationDebugGraphic = this.add.graphics().setDepth(3).setVisible(false);
    }

    this.cameras.main.setBounds(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(this.character.x, this.character.y - CAMERA_FOLLOW_OFFSET_Y);
    if (this.registry.get(CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY)) {
      this.cameras.main.startFollow(
        this.character,
        true,
        CAMERA_FOLLOW_LERP,
        CAMERA_FOLLOW_LERP,
        0,
        CAMERA_FOLLOW_OFFSET_Y,
      );
    }

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

      this.suspendCameraFollowForCurrentMovement();
      this.cameras.main.setScroll(
        this.dragStartScrollX - (pointer.x - this.dragStartPointerX) / this.cameras.main.zoom,
        this.dragStartScrollY - (pointer.y - this.dragStartPointerY) / this.cameras.main.zoom,
      );
    });

    const stopDragging = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.draggingPointerId) {
        this.draggingPointerId = null;
        if (this.cameraFollowSuspended) {
          this.suspendedMovementId = this.characterAutoWander.currentMovementId;
        }
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, stopDragging);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, stopDragging);
  }

  update(time: number, delta: number) {
    this.characterShadow.setPosition(
      this.character.x,
      this.character.y + CHARACTER_SHADOW_OFFSET_Y,
    );

    const horizontalDirection =
      Number(this.cursorKeys.right.isDown || this.movementKeys.right.isDown) -
      Number(this.cursorKeys.left.isDown || this.movementKeys.left.isDown);
    const verticalDirection =
      Number(this.cursorKeys.down.isDown || this.movementKeys.down.isDown) -
      Number(this.cursorKeys.up.isDown || this.movementKeys.up.isDown);

    const controlMode = this.registry.get(GAME_CONTROL_MODE_REGISTRY_KEY);
    if (controlMode === "character" && (horizontalDirection !== 0 || verticalDirection !== 0)) {
      this.characterAutoWander.pause(time);
      // 用户主动移动角色属于新的移动行为，应立即结束地图查看状态并恢复跟随。
      if (this.cameraFollowSuspended) {
        this.cameraFollowSuspended = false;
        this.startCameraFollow();
      }
      if (horizontalDirection !== 0) {
        this.characterMovement.set(horizontalDirection * this.characterMoveSpeed, 0);
      } else {
        this.characterMovement.set(0, verticalDirection * this.characterMoveSpeed);
      }
      this.character.setVelocity(this.characterMovement.x, this.characterMovement.y);
      this.playWalkAnimation(this.characterMovement);
      this.updateCharacterSpeech(time, true);
      this.drawNavigationDebug();
      return;
    }

    const autoMovement = this.characterAutoWander.update(time, this.character);
    // 地图移动只忽略当时那条路径；下一条路径生成后恢复相机跟随。
    if (
      this.cameraFollowSuspended &&
      this.characterAutoWander.currentMovementId !== this.suspendedMovementId &&
      this.draggingPointerId === null
    ) {
      this.cameraFollowSuspended = false;
      this.startCameraFollow();
    }
    this.character.setVelocity(autoMovement.x, autoMovement.y);
    if (autoMovement.lengthSq() === 0) {
      this.playIdleAnimation();
    } else {
      this.playWalkAnimation(autoMovement);
    }
    this.updateCharacterSpeech(time, autoMovement.lengthSq() !== 0);
    this.drawNavigationDebug();

    if (controlMode === "character") {
      return;
    }

    if (horizontalDirection === 0 && verticalDirection === 0) {
      return;
    }

    this.suspendCameraFollowForCurrentMovement();
    this.cameraMovement
      .set(horizontalDirection, verticalDirection)
      .normalize()
      .scale((CAMERA_MOVE_SPEED * delta) / 1000);
    this.cameras.main.scrollX += this.cameraMovement.x;
    this.cameras.main.scrollY += this.cameraMovement.y;
  }

  returnToWorldMap() {
    this.input.enabled = false;
    this.cameras.main.fadeOut(200, 73, 50, 71);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(WORLD_MAP_SCENE_KEY);
    });
  }

  setCollisionDebugVisible(visible: boolean) {
    this.physics.world.drawDebug = visible;
    this.collisionDebugGraphic.setVisible(visible);
    this.navigationDebugVisible = visible;
    this.navigationDebugGraphic.setVisible(visible);
    if (!visible) {
      this.collisionDebugGraphic.clear();
      this.navigationDebugGraphic.clear();
    }
  }

  setCameraFollowEnabled(enabled: boolean) {
    // Registry 保存用户对跟随功能的长期选择，临时暂停不会修改这个值。
    this.registry.set(CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY, enabled);
    this.cameraFollowSuspended = false;
    if (!enabled) {
      this.cameras.main.stopFollow();
      return;
    }

    this.startCameraFollow();
  }

  private startCameraFollow() {
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    this.cameras.main.startFollow(
      this.character,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP,
      0,
      CAMERA_FOLLOW_OFFSET_Y,
    );
    this.cameras.main.setScroll(scrollX, scrollY);
  }

  private suspendCameraFollowForCurrentMovement() {
    if (!this.registry.get(CAMERA_FOLLOW_CHARACTER_REGISTRY_KEY)) {
      return;
    }

    this.cameras.main.stopFollow();
    this.cameraFollowSuspended = true;
    // 记录正在执行的路径，直到 movementId 变化才认为进入了下一次移动。
    this.suspendedMovementId = this.characterAutoWander.currentMovementId;
  }

  private drawNavigationDebug() {
    if (!this.navigationDebugVisible) {
      return;
    }

    const path = this.characterAutoWander.remainingPath;
    this.navigationDebugGraphic.clear();
    if (path.length === 0) {
      return;
    }

    this.navigationDebugGraphic
      .lineStyle(1, NAVIGATION_DEBUG_LINE_COLOR, 0.9)
      .beginPath()
      .moveTo(this.character.body.center.x, this.character.body.center.y);
    for (const point of path) {
      this.navigationDebugGraphic.lineTo(point.x, point.y);
    }
    this.navigationDebugGraphic.strokePath().fillStyle(NAVIGATION_DEBUG_NODE_COLOR, 1);
    for (const point of path) {
      this.navigationDebugGraphic.fillRect(point.x - 1, point.y - 1, 3, 3);
    }

    const target = path[0];
    this.navigationDebugGraphic
      .fillStyle(NAVIGATION_DEBUG_TARGET_COLOR, 1)
      .fillRect(target.x - 2, target.y - 2, 5, 5);
  }

  private updateCharacterSpeech(time: number, characterIsMoving: boolean) {
    this.characterSpeechBubble.setPosition(
      this.character.x,
      this.character.y - CHARACTER_SPEECH_OFFSET_Y,
    );

    if (characterIsMoving) {
      // 移动会立即终止气泡，并让下一次待机从完整的随机间隔重新计时。
      this.nextSpeechCheckAt = null;
      this.speechVisibleUntil = null;
      this.characterSpeechBubble.setVisible(false);
      return;
    }

    if (this.speechVisibleUntil !== null) {
      if (time < this.speechVisibleUntil) {
        return;
      }

      this.speechVisibleUntil = null;
      this.characterSpeechBubble.setVisible(false);
      // 一句话结束后先留出新的待机间隔，避免气泡连续出现。
      this.nextSpeechCheckAt = time + this.getNextSpeechCheckDelay();
      return;
    }

    if (this.nextSpeechCheckAt === null) {
      // 首次进入待机只安排检查时间，不在当前帧立刻说话。
      this.nextSpeechCheckAt = time + this.getNextSpeechCheckDelay();
      return;
    }

    if (time < this.nextSpeechCheckAt) {
      return;
    }

    if (Phaser.Math.RND.frac() < CHARACTER_SPEECH_TRIGGER_PROBABILITY) {
      this.characterSpeechText.setText(Phaser.Math.RND.pick(CHARACTER_IDLE_SPEECHES));
      this.characterSpeechBubble.setVisible(true);
      this.speechVisibleUntil = time + CHARACTER_SPEECH_DISPLAY_DURATION;
      this.nextSpeechCheckAt = null;
      return;
    }

    // 本次概率判断未触发，等待新的随机间隔后再判断。
    this.nextSpeechCheckAt = time + this.getNextSpeechCheckDelay();
  }

  private getNextSpeechCheckDelay() {
    return Phaser.Math.Between(CHARACTER_SPEECH_CHECK_DELAY_MIN, CHARACTER_SPEECH_CHECK_DELAY_MAX);
  }

  private playIdleAnimation() {
    const currentAnimationKey = this.character.anims.currentAnim?.key;
    const isWinking =
      this.character.anims.isPlaying &&
      CHARACTER_WINK_ANIMATION_KEYS.some((animationKey) => animationKey === currentAnimationKey);

    if (!isWinking) {
      this.character.play(CHARACTER_ANIMATION.idle.key, true);
    }
  }

  private playWalkAnimation(movement: Phaser.Math.Vector2) {
    if (movement.x < 0) {
      this.character.play(CHARACTER_ANIMATION.walkLeft.key, true);
    } else if (movement.x > 0) {
      this.character.play(CHARACTER_ANIMATION.walkRight.key, true);
    } else if (movement.y < 0) {
      this.character.play(CHARACTER_ANIMATION.walkUp.key, true);
    } else {
      this.character.play(CHARACTER_ANIMATION.walkDown.key, true);
    }
  }

  private scheduleNextWink() {
    this.time.delayedCall(
      Phaser.Math.Between(CHARACTER_WINK_MIN_DELAY, CHARACTER_WINK_MAX_DELAY),
      () => {
        if (this.character.anims.currentAnim?.key === CHARACTER_ANIMATION.idle.key) {
          this.character.play(Phaser.Math.RND.pick(CHARACTER_WINK_ANIMATION_KEYS));
        }
        this.scheduleNextWink();
      },
    );
  }
}
