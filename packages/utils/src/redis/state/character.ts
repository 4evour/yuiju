import dayjs from "dayjs";
import { isDev } from "../../env";
import {
  ActionId,
  BusinessDistrictSubScene,
  type CharacterStateData,
  CoastAreaSubScene,
  HomeSubScene,
  type Location,
  MajorScene,
  ParkAreaSubScene,
  type RunningActionState,
  SchoolSubScene,
} from "../../types";
import { safeParseJson } from "../../utils";
import {
  getRedis,
  type RedisHashFields,
  type RedisReadSource,
  syncRedisStateWrite,
} from "../client";

export const REDIS_KEY_CHARACTER_STATE = isDev()
  ? "dev:yuiju:charactor:state"
  : "yuiju:charactor:state";

const DEFAULT_CHARACTER_STATE_DATA: CharacterStateData = {
  action: ActionId.Idle,
  location: { major: MajorScene.Home, minor: HomeSubScene.House },
  stamina: 100,
  satiety: 70,
  mood: 60,
  money: 0,
  dailyActionsDoneToday: [],
  inventory: [],
  runningAction: null,
};

type InitCharacterStateDataOptions = {
  readFrom?: RedisReadSource;
};

const isActionId = (value: string): value is ActionId => {
  return (Object.values(ActionId) as string[]).includes(value);
};

const isLocation = (value: unknown): value is Location => {
  if (!value || typeof value !== "object" || !("major" in value) || !("minor" in value)) {
    return false;
  }

  const location = value as { major: unknown; minor: unknown };

  if (location.major === MajorScene.Home) {
    return (Object.values(HomeSubScene) as unknown[]).includes(location.minor);
  }
  if (location.major === MajorScene.School) {
    return (Object.values(SchoolSubScene) as unknown[]).includes(location.minor);
  }
  if (location.major === MajorScene.BusinessDistrict) {
    return (Object.values(BusinessDistrictSubScene) as unknown[]).includes(location.minor);
  }
  if (location.major === MajorScene.ParkArea) {
    return (Object.values(ParkAreaSubScene) as unknown[]).includes(location.minor);
  }
  if (location.major === MajorScene.CoastArea) {
    return (Object.values(CoastAreaSubScene) as unknown[]).includes(location.minor);
  }

  return false;
};

const isValidIsoDateString = (value: unknown): value is string => {
  return typeof value === "string" && dayjs(value).isValid();
};

const parseRunningActionState = (value: unknown): RunningActionState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeRunningAction = value as Partial<RunningActionState>;

  if (!maybeRunningAction.action || !isActionId(maybeRunningAction.action)) {
    return null;
  }

  if (!isValidIsoDateString(maybeRunningAction.actionStartedAt)) {
    return null;
  }

  if (!isValidIsoDateString(maybeRunningAction.waitUntil)) {
    return null;
  }

  if (typeof maybeRunningAction.behaviorEpisodeId !== "string") {
    return null;
  }

  if (
    maybeRunningAction.startContext !== undefined &&
    (!maybeRunningAction.startContext ||
      typeof maybeRunningAction.startContext !== "object" ||
      Array.isArray(maybeRunningAction.startContext))
  ) {
    return null;
  }

  if (
    maybeRunningAction.proactiveShareIntent !== undefined &&
    (typeof maybeRunningAction.proactiveShareIntent.shouldShare !== "boolean" ||
      typeof maybeRunningAction.proactiveShareIntent.reason !== "string")
  ) {
    return null;
  }

  return {
    action: maybeRunningAction.action,
    actionStartedAt: maybeRunningAction.actionStartedAt,
    waitUntil: maybeRunningAction.waitUntil,
    behaviorEpisodeId: maybeRunningAction.behaviorEpisodeId,
    startContext: maybeRunningAction.startContext,
    proactiveShareIntent: maybeRunningAction.proactiveShareIntent,
  };
};

export const saveCharacterStateData = async (state: CharacterStateData): Promise<void> => {
  const redis = getRedis();
  const characterStateFields = {
    action: state.action,
    location: JSON.stringify(state.location),
    stamina: state.stamina,
    satiety: state.satiety,
    mood: state.mood,
    money: state.money,
    dailyActionsDoneToday: JSON.stringify(state.dailyActionsDoneToday),
    inventory: JSON.stringify(state.inventory ?? []),
    runningAction: JSON.stringify(state.runningAction),
  };

  await redis.hset(REDIS_KEY_CHARACTER_STATE, characterStateFields);
  await syncRedisStateWrite({
    command: "hset",
    key: REDIS_KEY_CHARACTER_STATE,
    fields: characterStateFields,
  });
};

export const updateCharacterStateData = async (
  fields: Partial<CharacterStateData>,
): Promise<void> => {
  const redis = getRedis();
  const characterStateFields: RedisHashFields = {};

  if (fields.action !== undefined) {
    characterStateFields.action = fields.action;
  }
  if (fields.location !== undefined) {
    characterStateFields.location = JSON.stringify(fields.location);
  }
  if (fields.stamina !== undefined) {
    characterStateFields.stamina = fields.stamina;
  }
  if (fields.satiety !== undefined) {
    characterStateFields.satiety = fields.satiety;
  }
  if (fields.mood !== undefined) {
    characterStateFields.mood = fields.mood;
  }
  if (fields.money !== undefined) {
    characterStateFields.money = fields.money;
  }
  if (fields.dailyActionsDoneToday !== undefined) {
    characterStateFields.dailyActionsDoneToday = JSON.stringify(fields.dailyActionsDoneToday);
  }
  if (fields.inventory !== undefined) {
    characterStateFields.inventory = JSON.stringify(fields.inventory);
  }
  if (fields.runningAction !== undefined) {
    characterStateFields.runningAction = JSON.stringify(fields.runningAction);
  }

  await redis.hset(REDIS_KEY_CHARACTER_STATE, characterStateFields);
  await syncRedisStateWrite({
    command: "hset",
    key: REDIS_KEY_CHARACTER_STATE,
    fields: characterStateFields,
  });
};

export const initCharacterStateData = async (
  options: InitCharacterStateDataOptions = {},
): Promise<CharacterStateData> => {
  const readFrom = options.readFrom ?? "primary";
  const redis = getRedis(readFrom);
  const raw = await redis.hgetall(REDIS_KEY_CHARACTER_STATE);

  if (Object.keys(raw).length === 0) {
    if (readFrom === "sync") {
      return { ...DEFAULT_CHARACTER_STATE_DATA };
    }

    await saveCharacterStateData(DEFAULT_CHARACTER_STATE_DATA);
    return { ...DEFAULT_CHARACTER_STATE_DATA };
  }

  const state: CharacterStateData = {
    ...DEFAULT_CHARACTER_STATE_DATA,
    dailyActionsDoneToday: [...DEFAULT_CHARACTER_STATE_DATA.dailyActionsDoneToday],
    inventory: [...(DEFAULT_CHARACTER_STATE_DATA.inventory ?? [])],
    runningAction: DEFAULT_CHARACTER_STATE_DATA.runningAction,
  };

  if (raw.action && isActionId(raw.action)) {
    state.action = raw.action;
  }

  if (raw.location) {
    const parsedLocation = safeParseJson<unknown>(raw.location);
    if (isLocation(parsedLocation)) {
      state.location = parsedLocation;
    }
  }

  if (raw.stamina) {
    const stamina = Number.parseInt(raw.stamina, 10);
    if (Number.isFinite(stamina)) state.stamina = stamina;
  }

  if (raw.satiety) {
    const satiety = Number.parseInt(raw.satiety, 10);
    if (Number.isFinite(satiety)) state.satiety = satiety;
  }

  if (raw.mood) {
    const mood = Number.parseInt(raw.mood, 10);
    if (Number.isFinite(mood)) state.mood = mood;
  }

  if (raw.money) {
    const money = Number.parseInt(raw.money, 10);
    if (Number.isFinite(money)) state.money = money;
  }

  if (raw.dailyActionsDoneToday) {
    const parsedDaily = safeParseJson<unknown>(raw.dailyActionsDoneToday);
    if (Array.isArray(parsedDaily)) {
      state.dailyActionsDoneToday = parsedDaily
        .filter((item): item is string => typeof item === "string")
        .filter((item): item is ActionId => isActionId(item));
    } else {
      state.dailyActionsDoneToday = [];
    }
  }

  if (raw.inventory) {
    const parsedInventory = safeParseJson<unknown>(raw.inventory);
    if (Array.isArray(parsedInventory)) {
      state.inventory = parsedInventory as NonNullable<CharacterStateData["inventory"]>;
    } else {
      state.inventory = [];
    }
  }

  if (raw.runningAction) {
    const parsedRunningAction = safeParseJson<unknown>(raw.runningAction);
    state.runningAction = parseRunningActionState(parsedRunningAction);
  }

  return state;
};

export const changeCharacterMoney = async (
  amount: number,
): Promise<{ previousMoney: number; currentMoney: number; delta: number }> => {
  const redis = getRedis();
  const currentMoney = await redis.hincrby(REDIS_KEY_CHARACTER_STATE, "money", amount);
  await syncCharacterMoney(currentMoney);

  return {
    previousMoney: currentMoney - amount,
    currentMoney,
    delta: amount,
  };
};

export const setCharacterMoney = async (
  amount: number,
): Promise<{ previousMoney: number; currentMoney: number; delta: number }> => {
  const redis = getRedis();
  const results = await redis
    .multi()
    .hget(REDIS_KEY_CHARACTER_STATE, "money")
    .hset(REDIS_KEY_CHARACTER_STATE, "money", amount)
    .hget(REDIS_KEY_CHARACTER_STATE, "money")
    .exec();

  if (!results) {
    throw new Error("redis transaction failed");
  }

  const [oldErr, oldValue] = results?.[0] ?? [];
  const [setErr] = results?.[1] ?? [];
  const [newErr, newValue] = results?.[2] ?? [];

  if (oldErr || setErr || newErr) {
    throw oldErr || setErr || newErr;
  }

  const previousMoney = Number.parseInt(String(oldValue ?? "0"), 10);
  const currentMoney = Number.parseInt(String(newValue ?? "0"), 10);
  await syncCharacterMoney(currentMoney);

  return {
    previousMoney,
    currentMoney,
    delta: currentMoney - previousMoney,
  };
};

export const syncCharacterMoney = async (money: number): Promise<void> => {
  await syncRedisStateWrite({
    command: "hset",
    key: REDIS_KEY_CHARACTER_STATE,
    fields: { money },
  });
};
