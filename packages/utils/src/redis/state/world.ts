import dayjs, { type Dayjs } from "dayjs";
import { cloneDeep } from "lodash-es";
import { COAST_VALUABLE_ITEMS, PARK_FRUIT_ITEMS } from "../../constants/world/resource";
import { isDev } from "../../env";
import type { SummerFestivalState } from "../../types/state";
import {
  type WorldSceneResourceState,
  type WorldSceneState,
  type WorldStateData,
  WorldSubScene,
} from "../../types/state";
import { TEMPERATURE_LEVELS, WEATHER_TYPES, type WeatherSnapshot } from "../../types/weather";
import { safeParseJson } from "../../utils";
import { getRedis, type RedisReadSource, syncRedisStateWrite } from "../client";

export const REDIS_KEY_WORLD_STATE = isDev() ? "dev:yuiju:world:state" : "yuiju:world:state";

type InitWorldStateDataOptions = {
  readFrom?: RedisReadSource;
};

const INITIAL_SUMMER_FESTIVAL_STATE: SummerFestivalState = {
  scheduledAt: "2026-08-15T18:00:00+08:00",
  requiredPreparationCount: 10,
  preparationCount: 0,
  heldAt: null,
};

const createInitialSceneResources = (resourceNames: string[]): WorldSceneResourceState[] => {
  return resourceNames.map((resourceName) => ({
    name: resourceName,
    amount: 0,
    lastRefreshedAt: null,
  }));
};

const isValidIsoDateString = (value: unknown): value is string => {
  return typeof value === "string" && dayjs(value).isValid();
};

const isWeatherType = (value: unknown): value is WeatherSnapshot["type"] => {
  return typeof value === "string" && WEATHER_TYPES.includes(value as WeatherSnapshot["type"]);
};

const isTemperatureLevel = (value: unknown): value is WeatherSnapshot["temperatureLevel"] => {
  return (
    typeof value === "string" &&
    TEMPERATURE_LEVELS.includes(value as WeatherSnapshot["temperatureLevel"])
  );
};

const parseWeatherSnapshot = (value: unknown): WeatherSnapshot | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeWeather = value as Partial<WeatherSnapshot>;

  if (!isWeatherType(maybeWeather.type)) {
    return null;
  }

  if (!isTemperatureLevel(maybeWeather.temperatureLevel)) {
    return null;
  }

  if (!isValidIsoDateString(maybeWeather.periodStartAt)) {
    return null;
  }

  if (!isValidIsoDateString(maybeWeather.periodEndAt)) {
    return null;
  }

  if (!isValidIsoDateString(maybeWeather.updatedAt)) {
    return null;
  }

  return {
    type: maybeWeather.type,
    temperatureLevel: maybeWeather.temperatureLevel,
    periodStartAt: maybeWeather.periodStartAt,
    periodEndAt: maybeWeather.periodEndAt,
    updatedAt: maybeWeather.updatedAt,
  };
};

const parseWorldScenes = (value: unknown): Record<WorldSubScene, WorldSceneState> => {
  const scenes: Record<WorldSubScene, WorldSceneState> = {
    [WorldSubScene.House]: {},
    [WorldSubScene.School]: { isOpen: false, changedAt: null },
    [WorldSubScene.Shop]: { isOpen: false, changedAt: null },
    [WorldSubScene.Supermarket]: { isOpen: false, changedAt: null },
    [WorldSubScene.Diner]: { isOpen: false, changedAt: null },
    [WorldSubScene.Cafe]: { isOpen: false, changedAt: null },
    [WorldSubScene.TrainStation]: {},
    [WorldSubScene.Park]: {
      resources: createInitialSceneResources(PARK_FRUIT_ITEMS.map((item) => item.name)),
    },
    [WorldSubScene.Pond]: {},
    [WorldSubScene.Shrine]: {},
    [WorldSubScene.Coast]: {
      resources: createInitialSceneResources(COAST_VALUABLE_ITEMS.map((item) => item.name)),
    },
  };

  if (!value || typeof value !== "object") {
    return scenes;
  }

  const rawScenes = value as Partial<Record<WorldSubScene, WorldSceneState>>;
  for (const sceneId of Object.keys(scenes) as WorldSubScene[]) {
    const scene = {
      ...scenes[sceneId],
      ...rawScenes[sceneId],
    };

    const initialResources = scenes[sceneId].resources;
    const rawResources = rawScenes[sceneId]?.resources;
    if (initialResources) {
      scene.resources = initialResources.map((resource) => {
        const rawResource = Array.isArray(rawResources)
          ? rawResources.find(
              (item) =>
                item && typeof item === "object" && "name" in item && item.name === resource.name,
            )
          : null;

        return {
          ...resource,
          ...(rawResource && typeof rawResource === "object" ? rawResource : {}),
        };
      });
    } else {
      delete scene.resources;
    }

    scenes[sceneId] = scene;
  }

  return scenes;
};

export const initWorldStateData = async (
  options: InitWorldStateDataOptions = {},
): Promise<WorldStateData> => {
  const readFrom = options.readFrom ?? "primary";
  const redis = getRedis(readFrom);
  const raw = await redis.hgetall(REDIS_KEY_WORLD_STATE);
  const timeStr = raw.time;

  if (!timeStr) {
    const time = dayjs();
    const lastAdvancedAt = time.toISOString();
    const scenes = parseWorldScenes(null);
    const summerFestival = cloneDeep(INITIAL_SUMMER_FESTIVAL_STATE);
    if (readFrom === "sync") {
      return { time, lastAdvancedAt, weather: null, scenes, summerFestival };
    }

    const timeValue = time.toISOString();
    const worldStateFields = {
      time: timeValue,
      lastAdvancedAt,
      weather: JSON.stringify(null),
      scenes: JSON.stringify(scenes),
      summerFestival: JSON.stringify(summerFestival),
    };
    await redis.hset(REDIS_KEY_WORLD_STATE, worldStateFields);
    await syncRedisStateWrite({
      command: "hset",
      key: REDIS_KEY_WORLD_STATE,
      fields: worldStateFields,
    });
    return { time, lastAdvancedAt, weather: null, scenes, summerFestival };
  }

  const parsed = dayjs(timeStr);
  if (!parsed.isValid()) {
    const time = dayjs();
    const lastAdvancedAt = time.toISOString();
    const scenes = parseWorldScenes(null);
    const summerFestival = cloneDeep(INITIAL_SUMMER_FESTIVAL_STATE);
    if (readFrom === "sync") {
      return { time, lastAdvancedAt, weather: null, scenes, summerFestival };
    }

    const timeValue = time.toISOString();
    const worldStateFields = {
      time: timeValue,
      lastAdvancedAt,
      weather: JSON.stringify(null),
      scenes: JSON.stringify(scenes),
      summerFestival: JSON.stringify(summerFestival),
    };
    await redis.hset(REDIS_KEY_WORLD_STATE, worldStateFields);
    await syncRedisStateWrite({
      command: "hset",
      key: REDIS_KEY_WORLD_STATE,
      fields: worldStateFields,
    });
    return { time, lastAdvancedAt, weather: null, scenes, summerFestival };
  }

  const weather = raw.weather ? parseWeatherSnapshot(safeParseJson(raw.weather)) : null;
  const lastAdvancedAt = isValidIsoDateString(raw.lastAdvancedAt)
    ? raw.lastAdvancedAt
    : parsed.toISOString();
  const scenes = parseWorldScenes(raw.scenes ? safeParseJson(raw.scenes) : null);
  const summerFestival = raw.summerFestival
    ? (JSON.parse(raw.summerFestival) as SummerFestivalState)
    : cloneDeep(INITIAL_SUMMER_FESTIVAL_STATE);

  return {
    time: parsed,
    lastAdvancedAt,
    weather,
    scenes,
    summerFestival,
  };
};

export const saveWorldStateData = async (state: WorldStateData): Promise<void> => {
  const redis = getRedis();
  const worldStateFields = {
    time: state.time.toISOString(),
    lastAdvancedAt: state.lastAdvancedAt,
    weather: JSON.stringify(state.weather),
    scenes: JSON.stringify(state.scenes),
    summerFestival: JSON.stringify(state.summerFestival),
  };

  await redis.hset(REDIS_KEY_WORLD_STATE, worldStateFields);
  await syncRedisStateWrite({
    command: "hset",
    key: REDIS_KEY_WORLD_STATE,
    fields: worldStateFields,
  });
};

export class WorldState {
  public time: Dayjs = dayjs();
  public lastAdvancedAt: string = dayjs().toISOString();
  public weather: WeatherSnapshot | null = null;
  public summerFestival: SummerFestivalState = cloneDeep(INITIAL_SUMMER_FESTIVAL_STATE);
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

  async load() {
    const data = await initWorldStateData();
    this.time = data.time;
    this.lastAdvancedAt = data.lastAdvancedAt;
    this.weather = data.weather;
    this.scenes = cloneDeep(data.scenes);
    this.summerFestival = cloneDeep(data.summerFestival);
  }

  async save() {
    await saveWorldStateData({
      time: this.time,
      lastAdvancedAt: this.lastAdvancedAt,
      weather: this.weather,
      scenes: this.scenes,
      summerFestival: this.summerFestival,
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
    this.summerFestival = cloneDeep(data.summerFestival);
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
    this.summerFestival = cloneDeep(INITIAL_SUMMER_FESTIVAL_STATE);
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
      summerFestival: this.summerFestival,
    });
  }
}
