import dayjs from "dayjs";
import { COAST_VALUABLE_ITEMS, PARK_FRUIT_ITEMS } from "../../constants";
import { isDev } from "../../env";
import {
  TEMPERATURE_LEVELS,
  WEATHER_TYPES,
  type WeatherSnapshot,
  type WorldSceneResourceState,
  type WorldSceneState,
  type WorldStateData,
  WorldSubScene,
} from "../../types";
import { safeParseJson } from "../../utils";
import { getRedis, type RedisReadSource, syncRedisStateWrite } from "../client";

export const REDIS_KEY_WORLD_STATE = isDev() ? "dev:yuiju:world:state" : "yuiju:world:state";

type InitWorldStateDataOptions = {
  readFrom?: RedisReadSource;
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
    if (readFrom === "sync") {
      return { time, lastAdvancedAt, weather: null, scenes };
    }

    const timeValue = time.toISOString();
    const worldStateFields = {
      time: timeValue,
      lastAdvancedAt,
      weather: JSON.stringify(null),
      scenes: JSON.stringify(scenes),
    };
    await redis.hset(REDIS_KEY_WORLD_STATE, worldStateFields);
    await syncRedisStateWrite({
      command: "hset",
      key: REDIS_KEY_WORLD_STATE,
      fields: worldStateFields,
    });
    return { time, lastAdvancedAt, weather: null, scenes };
  }

  const parsed = dayjs(timeStr);
  if (!parsed.isValid()) {
    const time = dayjs();
    const lastAdvancedAt = time.toISOString();
    const scenes = parseWorldScenes(null);
    if (readFrom === "sync") {
      return { time, lastAdvancedAt, weather: null, scenes };
    }

    const timeValue = time.toISOString();
    const worldStateFields = {
      time: timeValue,
      lastAdvancedAt,
      weather: JSON.stringify(null),
      scenes: JSON.stringify(scenes),
    };
    await redis.hset(REDIS_KEY_WORLD_STATE, worldStateFields);
    await syncRedisStateWrite({
      command: "hset",
      key: REDIS_KEY_WORLD_STATE,
      fields: worldStateFields,
    });
    return { time, lastAdvancedAt, weather: null, scenes };
  }

  const weather = raw.weather ? parseWeatherSnapshot(safeParseJson(raw.weather)) : null;
  const lastAdvancedAt = isValidIsoDateString(raw.lastAdvancedAt)
    ? raw.lastAdvancedAt
    : parsed.toISOString();
  const scenes = parseWorldScenes(raw.scenes ? safeParseJson(raw.scenes) : null);

  return {
    time: parsed,
    lastAdvancedAt,
    weather,
    scenes,
  };
};

export const saveWorldStateData = async (state: WorldStateData): Promise<void> => {
  const redis = getRedis();
  const worldStateFields = {
    time: state.time.toISOString(),
    lastAdvancedAt: state.lastAdvancedAt,
    weather: JSON.stringify(state.weather),
    scenes: JSON.stringify(state.scenes),
  };

  await redis.hset(REDIS_KEY_WORLD_STATE, worldStateFields);
  await syncRedisStateWrite({
    command: "hset",
    key: REDIS_KEY_WORLD_STATE,
    fields: worldStateFields,
  });
};
