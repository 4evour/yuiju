import {
  COAST_VALUABLE_ITEMS,
  PARK_FRUIT_ITEMS,
  type WorldSceneResourceState,
  WorldSubScene,
} from "@yuiju/utils";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resolveWeatherPeriod } from "@/engine/weather/time";
import { WorldStateRunner } from "@/engine/world/runner";
import { worldState } from "@/state/world-state";

describe.sequential("WorldStateRunner", () => {
  const morningTime = new Date("2026-06-07T09:30:00+08:00");
  const noonTime = new Date("2026-06-07T12:30:00+08:00");

  beforeEach(async () => {
    await worldState.reset();
  });

  afterAll(async () => {
    await worldState.reset();
  });

  it("会把真实天气、场景开放状态和资源刷新推进到 dev Redis", async () => {
    const runner = new WorldStateRunner();

    await runner.advanceWorld(morningTime);

    const currentState = await worldState.getData();
    const weatherPeriod = resolveWeatherPeriod(morningTime);

    expect(currentState.lastAdvancedAt).toBe(morningTime.toISOString());
    expect(currentState.time.toISOString()).toBe(morningTime.toISOString());

    expect(currentState.weather).not.toBeNull();
    expect(currentState.weather?.periodStartAt).toBe(weatherPeriod.startAt.toISOString());
    expect(currentState.weather?.periodEndAt).toBe(weatherPeriod.endAt.toISOString());
    expect(currentState.weather?.updatedAt).toBe(morningTime.toISOString());

    expect(currentState.scenes[WorldSubScene.School].isOpen).toBe(true);
    expect(currentState.scenes[WorldSubScene.Shop].isOpen).toBe(true);
    expect(currentState.scenes[WorldSubScene.Supermarket].isOpen).toBe(true);
    expect(currentState.scenes[WorldSubScene.Diner].isOpen).toBe(true);
    expect(currentState.scenes[WorldSubScene.Cafe].isOpen).toBe(false);

    expect(currentState.scenes[WorldSubScene.School].changedAt).toBe(morningTime.toISOString());
    expect(currentState.scenes[WorldSubScene.Shop].changedAt).toBe(morningTime.toISOString());
    expect(currentState.scenes[WorldSubScene.Supermarket].changedAt).toBe(
      morningTime.toISOString(),
    );
    expect(currentState.scenes[WorldSubScene.Diner].changedAt).toBe(morningTime.toISOString());
    expect(currentState.scenes[WorldSubScene.Cafe].changedAt).toBeNull();

    expect(currentState.scenes[WorldSubScene.House].isOpen).toBeUndefined();
    expect(currentState.scenes[WorldSubScene.House].changedAt).toBeUndefined();
    expect(currentState.scenes[WorldSubScene.Park].isOpen).toBeUndefined();
    expect(currentState.scenes[WorldSubScene.Park].changedAt).toBeUndefined();

    const parkResources = currentState.scenes[WorldSubScene.Park].resources ?? [];
    const coastResources = currentState.scenes[WorldSubScene.Coast].resources ?? [];

    expect(parkResources.map((resource) => resource.name)).toEqual(
      PARK_FRUIT_ITEMS.map((item) => item.name),
    );
    expect(coastResources.map((resource) => resource.name)).toEqual(
      COAST_VALUABLE_ITEMS.map((item) => item.name),
    );

    expect(sumResourceAmounts(parkResources)).toBeGreaterThanOrEqual(1);
    expect(sumResourceAmounts(parkResources)).toBeLessThanOrEqual(5);
    expect(sumResourceAmounts(coastResources)).toBeGreaterThanOrEqual(0);
    expect(sumResourceAmounts(coastResources)).toBeLessThanOrEqual(2);

    for (const resource of parkResources) {
      expect(resource.lastRefreshedAt).toBe(morningTime.toISOString());
    }

    for (const resource of coastResources) {
      expect(resource.lastRefreshedAt).toBe(morningTime.toISOString());
    }
  });

  it("同一天再次推进时不会重复刷新资源，但会推进天气时间片和场景状态", async () => {
    const runner = new WorldStateRunner();

    await runner.advanceWorld(morningTime);
    const morningState = await worldState.getData();
    const morningParkResources = cloneResources(
      morningState.scenes[WorldSubScene.Park].resources ?? [],
    );
    const morningCoastResources = cloneResources(
      morningState.scenes[WorldSubScene.Coast].resources ?? [],
    );

    await runner.advanceWorld(noonTime);

    const currentState = await worldState.getData();
    const weatherPeriod = resolveWeatherPeriod(noonTime);

    expect(currentState.lastAdvancedAt).toBe(noonTime.toISOString());
    expect(currentState.time.toISOString()).toBe(noonTime.toISOString());

    expect(currentState.weather).not.toBeNull();
    expect(currentState.weather?.periodStartAt).toBe(weatherPeriod.startAt.toISOString());
    expect(currentState.weather?.periodEndAt).toBe(weatherPeriod.endAt.toISOString());
    expect(currentState.weather?.updatedAt).toBe(noonTime.toISOString());

    expect(currentState.scenes[WorldSubScene.Cafe].isOpen).toBe(true);
    expect(currentState.scenes[WorldSubScene.Cafe].changedAt).toBe(noonTime.toISOString());
    expect(currentState.scenes[WorldSubScene.School].isOpen).toBe(true);
    expect(currentState.scenes[WorldSubScene.School].changedAt).toBe(morningTime.toISOString());

    expect(currentState.scenes[WorldSubScene.Park].resources).toEqual(morningParkResources);
    expect(currentState.scenes[WorldSubScene.Coast].resources).toEqual(morningCoastResources);
  });

  it("会先应用 commands 消费资源，再推进后续 world state", async () => {
    const runner = new WorldStateRunner();

    await runner.advanceWorld(morningTime);
    const morningState = await worldState.getData();
    const targetResource = pickResourceWithAmount(
      morningState.scenes[WorldSubScene.Park].resources ?? [],
      1,
    );

    runner.enqueueCommand({
      type: "consume_scene_resource",
      scene: WorldSubScene.Park,
      resource: targetResource.name,
      amount: 1,
    });

    await runner.advanceWorld(noonTime);

    const currentState = await worldState.getData();
    const currentResource = findResourceByName(
      currentState.scenes[WorldSubScene.Park].resources ?? [],
      targetResource.name,
    );

    expect(currentResource.amount).toBe(targetResource.amount - 1);
    expect(currentState.lastAdvancedAt).toBe(noonTime.toISOString());
    expect(currentState.scenes[WorldSubScene.Park].resources).not.toEqual(
      morningState.scenes[WorldSubScene.Park].resources,
    );
  });

  it("当 command 消费数量超过现有资源时会报错，并保持 world state 不变", async () => {
    const runner = new WorldStateRunner();

    await runner.advanceWorld(morningTime);
    const morningState = await worldState.getData();
    const targetResource = pickResourceWithAmount(
      morningState.scenes[WorldSubScene.Park].resources ?? [],
      1,
    );

    runner.enqueueCommand({
      type: "consume_scene_resource",
      scene: WorldSubScene.Park,
      resource: targetResource.name,
      amount: targetResource.amount + 1,
    });

    await expect(runner.advanceWorld(noonTime)).rejects.toThrow(
      `Invalid world resource consumption: ${WorldSubScene.Park}.${targetResource.name} ${targetResource.amount + 1}`,
    );

    const currentState = await worldState.getData();
    expect(currentState).toEqual(morningState);
  });
});

function sumResourceAmounts(resources: WorldSceneResourceState[]): number {
  return resources.reduce((sum, resource) => sum + resource.amount, 0);
}

function cloneResources(resources: WorldSceneResourceState[]): WorldSceneResourceState[] {
  return resources.map((resource) => ({ ...resource }));
}

function pickResourceWithAmount(
  resources: WorldSceneResourceState[],
  minAmount: number,
): WorldSceneResourceState {
  const resource = resources.find((item) => item.amount >= minAmount);

  if (!resource) {
    throw new Error(`Expected resource amount >= ${minAmount}, but none was found`);
  }

  return { ...resource };
}

function findResourceByName(
  resources: WorldSceneResourceState[],
  resourceName: string,
): WorldSceneResourceState {
  const resource = resources.find((item) => item.name === resourceName);

  if (!resource) {
    throw new Error(`Expected resource not found: ${resourceName}`);
  }

  return resource;
}
