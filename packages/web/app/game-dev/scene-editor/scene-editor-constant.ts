import moonTideCoast from "@/components/game-scene/assets/scenes/moon-tide-coast@2x.webp";
import { type GameSceneKey, MOON_TIDE_COAST_SCENE_KEY } from "@/components/game-scene/game/scene";
import type { SceneRegion } from "@/components/game-scene/game/scene-region";

interface SceneEditorSceneConfig {
  sceneKey: GameSceneKey;
  name: string;
  imageSource: string;
  width: number;
  height: number;
}

interface SceneRegionStyle {
  name: string;
  fillColor: string;
  strokeColor: string;
}

export const SCENE_EDITOR_SCENES = [
  {
    sceneKey: MOON_TIDE_COAST_SCENE_KEY,
    name: "月汐海岸",
    imageSource: moonTideCoast.src,
    width: 1376,
    height: 768,
  },
] as const satisfies readonly SceneEditorSceneConfig[];

export type SceneEditorSceneKey = (typeof SCENE_EDITOR_SCENES)[number]["sceneKey"];

export const INITIAL_SCENE_EDITOR_SCENE_KEY: SceneEditorSceneKey = MOON_TIDE_COAST_SCENE_KEY;

export const SCENE_REGION_STYLE = {
  solid: {
    name: "实体障碍",
    fillColor: "#c94d62",
    strokeColor: "#8f2e45",
  },
} as const satisfies Record<SceneRegion["kind"], SceneRegionStyle>;
