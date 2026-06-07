import {
  COAST_VALUABLE_ITEMS,
  type IWorldState,
  initWorldStateData,
  PARK_FRUIT_ITEMS,
  saveWorldStateData,
  type WeatherSnapshot,
  type WorldSceneState,
  type WorldStateData,
  WorldSubScene,
} from "@yuiju/utils";
import dayjs, { type Dayjs } from "dayjs";
import { cloneDeep } from "lodash-es";

export class WorldState implements IWorldState {
  public time: Dayjs = dayjs();
  public lastAdvancedAt: string = dayjs().toISOString();
  public weather: WeatherSnapshot | null = null;
  public scenes: Record<WorldSubScene, WorldSceneState> = {
    [WorldSubScene.House]: {},
    [WorldSubScene.School]: { isOpen: false, changedAt: null },
    [WorldSubScene.Shop]: { isOpen: false, changedAt: null },
    [WorldSubScene.Supermarket]: { isOpen: false, changedAt: null },
    [WorldSubScene.Diner]: { isOpen: false, changedAt: null },
    [WorldSubScene.Cafe]: { isOpen: false, changedAt: null },
    [WorldSubScene.TrainStation]: {},
    [WorldSubScene.Park]: {
      resources: PARK_FRUIT_ITEMS.map((item) => ({
        name: item.name,
        amount: 0,
        lastRefreshedAt: null,
      })),
    },
    [WorldSubScene.Pond]: {},
    [WorldSubScene.Shrine]: {},
    [WorldSubScene.Coast]: {
      resources: COAST_VALUABLE_ITEMS.map((item) => ({
        name: item.name,
        amount: 0,
        lastRefreshedAt: null,
      })),
    },
  };

  private static instance: WorldState | null = null;

  static getInstance() {
    if (!WorldState.instance) WorldState.instance = new WorldState();
    return WorldState.instance;
  }

  async load() {
    const data = await initWorldStateData();
    this.time = data.time;
    this.lastAdvancedAt = data.lastAdvancedAt;
    this.weather = data.weather;
    this.scenes = cloneDeep(data.scenes);
  }

  async save() {
    await saveWorldStateData({
      time: this.time,
      lastAdvancedAt: this.lastAdvancedAt,
      weather: this.weather,
      scenes: this.scenes,
    });
  }

  public async getData(): Promise<WorldStateData> {
    await this.load();
    return this.log();
  }

  public async setData(data: WorldStateData) {
    this.time = data.time;
    this.lastAdvancedAt = data.lastAdvancedAt;
    this.weather = data.weather ? cloneDeep(data.weather) : null;
    this.scenes = cloneDeep(data.scenes);
    await this.save();
  }

  public async updateTime(newTime?: Dayjs) {
    this.time = newTime || dayjs();
    await this.save();
  }

  /**
   * 持久化当前天气快照。
   *
   * 说明：
   * - 天气作为世界背景状态的一部分，与世界时间共享同一份 Redis Hash；
   * - 这里不负责生成天气，只负责更新当前真相源。
   */
  public async setWeather(snapshot: WeatherSnapshot) {
    this.weather = cloneDeep(snapshot);
    await this.save();
  }

  /**
   * 获取当前天气快照。
   *
   * 返回深拷贝，避免调用方直接修改内存态。
   */
  public getWeather(): WeatherSnapshot | null {
    return this.weather ? cloneDeep(this.weather) : null;
  }

  public async reset() {
    this.time = dayjs();
    this.lastAdvancedAt = this.time.toISOString();
    this.weather = null;
    this.scenes = {
      [WorldSubScene.House]: {},
      [WorldSubScene.School]: { isOpen: false, changedAt: null },
      [WorldSubScene.Shop]: { isOpen: false, changedAt: null },
      [WorldSubScene.Supermarket]: { isOpen: false, changedAt: null },
      [WorldSubScene.Diner]: { isOpen: false, changedAt: null },
      [WorldSubScene.Cafe]: { isOpen: false, changedAt: null },
      [WorldSubScene.TrainStation]: {},
      [WorldSubScene.Park]: {
        resources: PARK_FRUIT_ITEMS.map((item) => ({
          name: item.name,
          amount: 0,
          lastRefreshedAt: null,
        })),
      },
      [WorldSubScene.Pond]: {},
      [WorldSubScene.Shrine]: {},
      [WorldSubScene.Coast]: {
        resources: COAST_VALUABLE_ITEMS.map((item) => ({
          name: item.name,
          amount: 0,
          lastRefreshedAt: null,
        })),
      },
    };
    await this.save();
  }

  public log(): WorldStateData {
    return cloneDeep({
      time: this.time,
      lastAdvancedAt: this.lastAdvancedAt,
      weather: this.weather,
      scenes: this.scenes,
    });
  }
}

export const worldState = WorldState.getInstance();
