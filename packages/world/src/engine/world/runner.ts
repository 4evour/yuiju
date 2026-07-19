import type { WorldStateData } from "@yuiju/utils";
import dayjs from "dayjs";
import { cloneDeep } from "lodash-es";
import { worldState } from "@/state/world-state";
import { logger } from "@/utils/logger";
import type { WorldCommand } from "./command";
import {
  ResourceEvolution,
  SceneEvolution,
  WeatherEvolution,
  type WorldAdvanceContext,
  type WorldEvolution,
} from "./evolution";

const WORLD_TICK_INTERVAL_MS = 60_000;

/**
 * WorldStateRunner 负责推进世界状态本身，不负责选择或执行角色 Action。
 *
 * 它启动时先把 WorldState 从上次推进时间恢复到当前时间，之后按固定间隔运行 world tick。
 * 每次 tick 会先消费外部 WorldCommand，再按顺序执行天气、场景和资源等 evolution，
 * 最后把新的 WorldState 写回 Redis。
 */
export class WorldStateRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private activeTick: Promise<void> | null = null;
  private commands: WorldCommand[] = [];

  constructor(
    private readonly evolutions: WorldEvolution[] = [
      new WeatherEvolution(),
      new SceneEvolution(),
      new ResourceEvolution(),
    ],
  ) {}

  async start(): Promise<void> {
    if (this.timer) {
      return;
    }

    await this.recoverToNow();

    this.timer = setInterval(() => {
      this.runTick().catch((error) => {
        logger.error("[world] tick failed", error);
      });
    }, WORLD_TICK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  enqueueCommand(command: WorldCommand): void {
    this.commands.push(command);
  }

  async consumeCommandsAndRunTick(
    commands: WorldCommand[],
    toTime: Date = new Date(),
  ): Promise<void> {
    for (const command of commands) {
      this.enqueueCommand(command);
    }

    await this.runTick(toTime);
  }

  async recoverToNow(): Promise<void> {
    await this.runTick(new Date());
  }

  async runTick(toTime: Date = new Date()): Promise<void> {
    if (this.activeTick) {
      return this.activeTick;
    }

    this.activeTick = this.advanceWorld(toTime).finally(() => {
      this.activeTick = null;
    });

    return this.activeTick;
  }

  public async advanceWorld(toTime: Date): Promise<void> {
    const currentState = await worldState.getData();
    const fromTime = dayjs(currentState.lastAdvancedAt).toDate();
    const commands = this.commands;
    this.commands = [];
    let nextState = this.applyCommands(currentState, commands);

    for (const evolution of this.evolutions) {
      const context: WorldAdvanceContext = {
        fromTime,
        toTime,
        deltaMs: toTime.getTime() - fromTime.getTime(),
        worldStateData: nextState,
        commands,
      };

      if (await evolution.precondition(context)) {
        nextState = await evolution.advance(context);
      }
    }

    await worldState.setData({
      ...nextState,
      time: dayjs(toTime),
      lastAdvancedAt: toTime.toISOString(),
    });
  }

  private applyCommands(state: WorldStateData, commands: WorldCommand[]): WorldStateData {
    if (commands.length === 0) {
      return state;
    }

    const nextState = cloneDeep(state);

    for (const command of commands) {
      const scene = nextState.scenes[command.scene];
      const resource = scene.resources?.find((item) => item.name === command.resource);

      if (!resource) {
        throw new Error(`World resource not found: ${command.scene}.${command.resource}`);
      }

      if (command.amount <= 0 || resource.amount < command.amount) {
        throw new Error(
          `Invalid world resource consumption: ${command.scene}.${command.resource} ${command.amount}`,
        );
      }

      resource.amount -= command.amount;
    }

    return nextState;
  }
}

export const worldStateRunner = new WorldStateRunner();
