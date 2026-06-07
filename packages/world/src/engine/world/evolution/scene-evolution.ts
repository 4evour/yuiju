import {
  formatProjectTime,
  type WorldSceneState,
  type WorldStateData,
  WorldSubScene,
} from "@yuiju/utils";
import { cloneDeep } from "lodash-es";
import { type WorldAdvanceContext, WorldEvolution } from "./world-evolution";

export class SceneEvolution extends WorldEvolution {
  precondition(): boolean {
    return true;
  }

  async advance(context: WorldAdvanceContext): Promise<WorldStateData> {
    const scenes = cloneDeep(context.worldStateData.scenes);
    const currentMinutes = this.readProjectMinutes(context.toTime);
    const changedAt = context.toTime.toISOString();

    scenes[WorldSubScene.School] = this.advanceSceneOpenState(
      scenes[WorldSubScene.School],
      currentMinutes >= 8 * 60 && currentMinutes < 17 * 60,
      changedAt,
    );
    scenes[WorldSubScene.Shop] = this.advanceSceneOpenState(
      scenes[WorldSubScene.Shop],
      currentMinutes >= 9 * 60 && currentMinutes < 21 * 60,
      changedAt,
    );
    scenes[WorldSubScene.Supermarket] = this.advanceSceneOpenState(
      scenes[WorldSubScene.Supermarket],
      currentMinutes >= 9 * 60 && currentMinutes < 21 * 60,
      changedAt,
    );
    scenes[WorldSubScene.Diner] = this.advanceSceneOpenState(
      scenes[WorldSubScene.Diner],
      currentMinutes >= 7 * 60 && currentMinutes < 20 * 60,
      changedAt,
    );
    scenes[WorldSubScene.Cafe] = this.advanceSceneOpenState(
      scenes[WorldSubScene.Cafe],
      currentMinutes >= 10 * 60 && currentMinutes < 20 * 60,
      changedAt,
    );

    scenes[WorldSubScene.House] = this.keepPermanentScene(scenes[WorldSubScene.House]);
    scenes[WorldSubScene.TrainStation] = this.keepPermanentScene(
      scenes[WorldSubScene.TrainStation],
    );
    scenes[WorldSubScene.Park] = this.keepPermanentScene(scenes[WorldSubScene.Park]);
    scenes[WorldSubScene.Pond] = this.keepPermanentScene(scenes[WorldSubScene.Pond]);
    scenes[WorldSubScene.Shrine] = this.keepPermanentScene(scenes[WorldSubScene.Shrine]);
    scenes[WorldSubScene.Coast] = this.keepPermanentScene(scenes[WorldSubScene.Coast]);

    return {
      ...context.worldStateData,
      scenes,
    };
  }

  private readProjectMinutes(input: Date): number {
    const [hour, minute] = formatProjectTime(input, "HH:mm").split(":").map(Number);
    return hour * 60 + minute;
  }

  private advanceSceneOpenState(
    currentScene: WorldSceneState,
    isOpen: boolean,
    changedAt: string,
  ): WorldSceneState {
    return {
      ...currentScene,
      isOpen,
      changedAt: currentScene.isOpen === isOpen ? (currentScene.changedAt ?? null) : changedAt,
    };
  }

  private keepPermanentScene(currentScene: WorldSceneState): WorldSceneState {
    const nextScene = { ...currentScene };
    delete nextScene.isOpen;
    delete nextScene.changedAt;
    return nextScene;
  }
}
