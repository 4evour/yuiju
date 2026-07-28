import dayjs from "dayjs";
import { isDev } from "../../env";
import {
  BusinessDistrictSubScene,
  type CharacterStateData,
  CoastAreaSubScene,
  HomeSubScene,
  type InventoryItem,
  type Location,
  MajorScene,
  ParkAreaSubScene,
  type RunningActionState,
  SchoolSubScene,
} from "../../types";
import { ActionId } from "../../types/action";
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
  phoneBattery: 100,
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

const isLocation = (value: string) => {
  if (!value || typeof value !== "object" || !("major" in value) || !("minor" in value)) {
    return false;
  }

  const location = value as { major: string; minor: string };

  if (location.major === MajorScene.Home) {
    return (Object.values(HomeSubScene) as string[]).includes(location.minor);
  }
  if (location.major === MajorScene.School) {
    return (Object.values(SchoolSubScene) as string[]).includes(location.minor);
  }
  if (location.major === MajorScene.BusinessDistrict) {
    return (Object.values(BusinessDistrictSubScene) as string[]).includes(location.minor);
  }
  if (location.major === MajorScene.ParkArea) {
    return (Object.values(ParkAreaSubScene) as string[]).includes(location.minor);
  }
  if (location.major === MajorScene.CoastArea) {
    return (Object.values(CoastAreaSubScene) as string[]).includes(location.minor);
  }

  return false;
};

const isValidIsoDateString = (value?: string): value is string => {
  return typeof value === "string" && dayjs(value).isValid();
};

const parseRunningActionState = (value: any): RunningActionState | null => {
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
    phoneBattery: state.phoneBattery,
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
  if (fields.phoneBattery !== undefined) {
    characterStateFields.phoneBattery = fields.phoneBattery;
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
    const parsedLocation = safeParseJson<any>(raw.location);
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

  if (raw.phoneBattery) {
    const phoneBattery = Number.parseInt(raw.phoneBattery, 10);
    if (Number.isFinite(phoneBattery)) state.phoneBattery = phoneBattery;
  }

  if (raw.dailyActionsDoneToday) {
    const parsedDaily = safeParseJson<any>(raw.dailyActionsDoneToday);
    if (Array.isArray(parsedDaily)) {
      state.dailyActionsDoneToday = parsedDaily
        .filter((item): item is string => typeof item === "string")
        .filter((item): item is ActionId => isActionId(item));
    } else {
      state.dailyActionsDoneToday = [];
    }
  }

  if (raw.inventory) {
    const parsedInventory = safeParseJson<any>(raw.inventory);
    if (Array.isArray(parsedInventory)) {
      state.inventory = parsedInventory as NonNullable<CharacterStateData["inventory"]>;
    } else {
      state.inventory = [];
    }
  }

  if (raw.runningAction) {
    const parsedRunningAction = safeParseJson<any>(raw.runningAction);
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

export const changeCharacterMoodByChat = async (
  delta: -1 | 1,
): Promise<{ previousMood: number; currentMood: number; delta: number }> => {
  const state = await initCharacterStateData();
  let currentMood = state.mood + delta;
  if (delta < 0) {
    currentMood = state.mood <= 30 ? state.mood : Math.max(30, currentMood);
  } else {
    currentMood = Math.min(100, currentMood);
  }

  if (currentMood !== state.mood) {
    await updateCharacterStateData({ mood: currentMood });
  }

  return {
    previousMood: state.mood,
    currentMood,
    delta: currentMood - state.mood,
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

const MAX_STAMINA = 100;
const MAX_SATIETY = 100;
const MAX_MOOD = 100;
const MAX_PHONE_BATTERY = 100;

export class CharacterState {
  async load() {
    await initCharacterStateData();
  }

  async getData(): Promise<CharacterStateData> {
    return await initCharacterStateData();
  }

  async setAction(action: ActionId) {
    await updateCharacterStateData({ action });
  }

  async setLocation(location: Location) {
    await updateCharacterStateData({ location });
  }

  async setStamina(stamina: number) {
    await updateCharacterStateData({ stamina: Math.min(MAX_STAMINA, Math.max(0, stamina)) });
  }

  async setSatiety(satiety: number) {
    await updateCharacterStateData({ satiety: Math.min(MAX_SATIETY, Math.max(0, satiety)) });
  }

  async setMood(mood: number) {
    await updateCharacterStateData({ mood: Math.min(MAX_MOOD, Math.max(0, mood)) });
  }

  async changeStamina(delta: number) {
    const data = await this.getData();
    await this.setStamina(data.stamina + delta);
  }

  async changeSatiety(delta: number) {
    const data = await this.getData();
    await this.setSatiety(data.satiety + delta);
  }

  async changeMood(delta: number) {
    const data = await this.getData();
    const mood = Math.min(MAX_MOOD, Math.max(0, data.mood + delta));
    await this.setMood(mood);
    return mood - data.mood;
  }

  async recoverMood(baseGain: number) {
    const data = await this.getData();
    const actualGain = Math.min(
      MAX_MOOD - data.mood,
      Math.round(baseGain * ((MAX_MOOD - data.mood) / MAX_MOOD)),
    );
    if (actualGain !== 0) {
      await this.setMood(data.mood + actualGain);
    }
    return actualGain;
  }

  async changeMoney(delta: number) {
    await changeCharacterMoney(delta);
  }

  async setPhoneBattery(phoneBattery: number) {
    await updateCharacterStateData({
      phoneBattery: Math.min(MAX_PHONE_BATTERY, Math.max(0, phoneBattery)),
    });
  }

  async changePhoneBattery(delta: number) {
    const data = await this.getData();
    await this.setPhoneBattery(data.phoneBattery + delta);
  }

  async markActionDoneToday(action: ActionId): Promise<void> {
    const data = await this.getData();

    if (data.dailyActionsDoneToday.includes(action)) {
      return;
    }

    await updateCharacterStateData({
      dailyActionsDoneToday: [...data.dailyActionsDoneToday, action],
    });
  }

  async clearDailyActions(): Promise<void> {
    await updateCharacterStateData({ dailyActionsDoneToday: [] });
  }

  async setRunningAction(runningAction: RunningActionState): Promise<void> {
    await updateCharacterStateData({ runningAction: { ...runningAction } });
  }

  async clearRunningAction(): Promise<void> {
    await updateCharacterStateData({ runningAction: null });
  }

  async getRunningAction(): Promise<RunningActionState | null> {
    const data = await this.getData();
    return data.runningAction;
  }

  async addItem(item: Omit<InventoryItem, "quantity">, quantity: number = 1): Promise<void> {
    if (quantity <= 0) {
      return;
    }

    const data = await this.getData();
    const inventory = [...(data.inventory ?? [])];
    const existingItem = inventory.find((inventoryItem) => inventoryItem.name === item.name);

    if (existingItem) {
      existingItem.description = item.description;
      existingItem.categories = item.categories;
      existingItem.metadata = item.metadata;
      existingItem.quantity = (existingItem.quantity ?? 0) + quantity;
    } else {
      inventory.push({
        ...item,
        quantity,
      });
    }

    await updateCharacterStateData({ inventory });
  }

  async consumeItem(itemName: string, quantity: number = 1): Promise<boolean> {
    const data = await this.getData();
    const inventory = [...(data.inventory ?? [])];
    const item = inventory.find((inventoryItem) => inventoryItem.name === itemName);

    if (!item?.quantity) {
      return false;
    }

    if (item.quantity < quantity) {
      return false;
    }

    item.quantity -= quantity;

    if (item.quantity <= 0) {
      const index = inventory.indexOf(item);
      inventory.splice(index, 1);
    }

    await updateCharacterStateData({ inventory });
    return true;
  }

  async getItemQuantity(itemName: string): Promise<number> {
    const data = await this.getData();
    const item = data.inventory?.find((inventoryItem) => inventoryItem.name === itemName);
    return item ? (item.quantity ?? 0) : 0;
  }
}
