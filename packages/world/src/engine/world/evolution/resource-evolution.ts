import {
  COAST_VALUABLE_ITEMS,
  formatProjectTime,
  PARK_FRUIT_ITEMS,
  type WorldSceneResourceState,
  type WorldStateData,
  WorldSubScene,
} from "@yuiju/utils";
import { cloneDeep } from "lodash-es";
import { type WorldAdvanceContext, WorldEvolution } from "./world-evolution";

export class ResourceEvolution extends WorldEvolution {
  precondition(context: WorldAdvanceContext): boolean {
    const parkResources = context.worldStateData.scenes[WorldSubScene.Park].resources;
    const coastResources = context.worldStateData.scenes[WorldSubScene.Coast].resources;

    return (
      PARK_FRUIT_ITEMS.every((item) =>
        parkResources?.some((resource) => resource.name === item.name),
      ) &&
      COAST_VALUABLE_ITEMS.every((item) =>
        coastResources?.some((resource) => resource.name === item.name),
      )
    );
  }

  async advance(context: WorldAdvanceContext): Promise<WorldStateData> {
    const scenes = cloneDeep(context.worldStateData.scenes);
    const refreshedAt = context.toTime.toISOString();

    scenes[WorldSubScene.Park].resources = this.refreshDailyResources(
      scenes[WorldSubScene.Park].resources!,
      PARK_FRUIT_ITEMS.map((item) => item.name),
      context.toTime,
      refreshedAt,
      1,
      5,
    );
    scenes[WorldSubScene.Coast].resources = this.refreshDailyResources(
      scenes[WorldSubScene.Coast].resources!,
      COAST_VALUABLE_ITEMS.map((item) => item.name),
      context.toTime,
      refreshedAt,
      0,
      2,
    );

    return {
      ...context.worldStateData,
      scenes,
    };
  }

  private refreshDailyResources(
    resources: WorldSceneResourceState[],
    resourceNames: string[],
    toTime: Date,
    refreshedAt: string,
    minTotalAmount: number,
    maxTotalAmount: number,
  ): WorldSceneResourceState[] {
    const firstResource = resources[0];
    const currentDate = formatProjectTime(toTime, "YYYY-MM-DD");
    const lastRefreshedDate = firstResource.lastRefreshedAt
      ? formatProjectTime(firstResource.lastRefreshedAt, "YYYY-MM-DD")
      : null;

    if (lastRefreshedDate === currentDate) {
      return resources;
    }

    const refreshedAmounts = this.buildRefreshedAmounts(
      resourceNames,
      minTotalAmount,
      maxTotalAmount,
    );

    return resources.map((resource) => ({
      ...resource,
      amount: refreshedAmounts[resource.name],
      lastRefreshedAt: refreshedAt,
    }));
  }

  private buildRefreshedAmounts(
    resourceNames: string[],
    minTotalAmount: number,
    maxTotalAmount: number,
  ): Record<string, number> {
    const totalAmount = this.randomInteger(minTotalAmount, maxTotalAmount);
    const amounts = Object.fromEntries(resourceNames.map((resourceName) => [resourceName, 0]));

    for (let index = 0; index < totalAmount; index += 1) {
      const resourceName = resourceNames[this.randomInteger(0, resourceNames.length - 1)];
      amounts[resourceName] += 1;
    }

    return amounts;
  }

  private randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
