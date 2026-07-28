import { planManager } from "@yuiju/utils/memory/plan/manager";
import { CharacterState } from "@yuiju/utils/redis/state/character";
import { WorldState } from "@yuiju/utils/redis/state/world";

export const characterState = new CharacterState();
export const worldState = new WorldState();

export async function initState(): Promise<void> {
  await characterState.load();
  await worldState.load();
  await planManager.getState();
}
