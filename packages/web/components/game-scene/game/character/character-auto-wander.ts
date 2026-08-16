import Phaser from "phaser";
import type { GridPathfinder, NavigationPoint } from "../navigation/grid-pathfinder";

interface CharacterAutoWanderConfig {
  speed: number;
  minimumDestinationDistance: number;
  idleDurationMin: number;
  idleDurationMax: number;
}

const WAYPOINT_REACHED_DISTANCE = 1;

export class CharacterAutoWander {
  private readonly movement = new Phaser.Math.Vector2();
  private readonly pathfinder: GridPathfinder;
  private readonly config: CharacterAutoWanderConfig;
  // path 只保存尚未到达的节点；清空后角色进入随机时长的待机阶段。
  private path: NavigationPoint[] = [];
  // EasyStar 分帧计算路径，ID 存在时只推进计算，不让角色提前移动。
  private pathRequestId: number | null = null;
  // 到达该时间后，才会为下一次闲逛选择目的地。
  private resumeAt: number;
  private currentTime: number;
  // 每条成功生成的路径代表一次新的移动行为，供相机区分“本次”和“下次”移动。
  private movementId = 0;

  constructor(pathfinder: GridPathfinder, config: CharacterAutoWanderConfig, startTime: number) {
    this.pathfinder = pathfinder;
    this.config = config;
    this.currentTime = startTime;
    this.resumeAt = startTime + this.getIdleDuration();
  }

  get remainingPath(): readonly NavigationPoint[] {
    return this.path;
  }

  get currentMovementId(): number {
    return this.movementId;
  }

  update(time: number, character: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    this.currentTime = time;

    // EasyStar 的 calculate 是增量计算；路径返回前角色保持待机。
    if (this.pathRequestId !== null) {
      this.pathfinder.calculate();
      return this.movement.set(0, 0);
    }

    // 没有路径时先等待，等待结束后再随机选择一个足够远的可行走点。
    if (this.path.length === 0) {
      if (time < this.resumeAt) {
        return this.movement.set(0, 0);
      }

      const origin = { x: character.body.center.x, y: character.body.center.y };
      const minimumDistanceSquared = this.config.minimumDestinationDistance ** 2;
      const destinations = this.pathfinder.walkablePoints.filter(
        (point) => (point.x - origin.x) ** 2 + (point.y - origin.y) ** 2 >= minimumDistanceSquared,
      );
      const destination = Phaser.Math.RND.pick(destinations)!;
      const pathRequestId = this.pathfinder.findPath(origin, destination, (path) => {
        if (this.pathRequestId !== pathRequestId) {
          return;
        }

        this.pathRequestId = null;
        if (path === null) {
          this.resumeAt = this.currentTime + this.getIdleDuration();
          return;
        }
        this.path = path;
        // 只有拿到有效路径才算开始了下一次移动行为。
        this.movementId += 1;
      });
      this.pathRequestId = pathRequestId;
      return this.movement.set(0, 0);
    }

    if (this.isBlocked(character.body)) {
      this.pause(time);
      return this.movement;
    }

    const target = this.path[0];
    const distanceX = target.x - character.body.center.x;
    const distanceY = target.y - character.body.center.y;

    // 角色只有四方向动画，因此每次只处理一个坐标轴，禁止沿对角线移动。
    if (Math.abs(distanceX) > WAYPOINT_REACHED_DISTANCE) {
      return this.movement.set(Math.sign(distanceX) * this.config.speed, 0);
    }
    if (Math.abs(distanceY) > WAYPOINT_REACHED_DISTANCE) {
      return this.movement.set(0, Math.sign(distanceY) * this.config.speed);
    }

    this.path.shift();
    if (this.path.length === 0) {
      // 最后一个节点到达后重新进入随机时长的待机阶段。
      this.resumeAt = time + this.getIdleDuration();
    }
    return this.movement.set(0, 0);
  }

  pause(time: number) {
    // 手动控制会终止本次自动移动，并从松开控制后的待机阶段重新开始。
    if (this.pathRequestId !== null) {
      this.pathfinder.cancelPath(this.pathRequestId);
      this.pathRequestId = null;
    }
    this.path = [];
    this.resumeAt = time + this.getIdleDuration();
    this.movement.set(0, 0);
  }

  private isBlocked(body: Phaser.Physics.Arcade.Body) {
    return (
      (this.movement.x < 0 && body.blocked.left) ||
      (this.movement.x > 0 && body.blocked.right) ||
      (this.movement.y < 0 && body.blocked.up) ||
      (this.movement.y > 0 && body.blocked.down)
    );
  }

  private getIdleDuration() {
    return Phaser.Math.Between(this.config.idleDurationMin, this.config.idleDurationMax);
  }
}
