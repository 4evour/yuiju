import {
  type ActionId,
  type CharacterStateData,
  changeCharacterMoney,
  type ICharacterState,
  type InventoryItem,
  initCharacterStateData,
  type Location,
  type RunningActionState,
  updateCharacterStateData,
} from "@yuiju/utils";

const MAX_STAMINA = 100;
const MAX_SATIETY = 100;
const MAX_MOOD = 100;

export class CharacterState implements ICharacterState {
  private static instance: CharacterState | null = null;

  static getInstance() {
    if (!CharacterState.instance) CharacterState.instance = new CharacterState();
    return CharacterState.instance;
  }

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
    await this.setMood(data.mood + delta);
  }

  async changeMoney(delta: number) {
    await changeCharacterMoney(delta);
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

export const characterState = CharacterState.getInstance();
