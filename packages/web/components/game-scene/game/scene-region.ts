import type { GameSceneKey } from "./scene";

export interface SceneRectangleShape {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneRegion {
  id: string;
  kind: "solid";
  shape: SceneRectangleShape;
}

export interface SceneRegionDocument {
  version: 1;
  sceneKey: GameSceneKey;
  width: number;
  height: number;
  regions: SceneRegion[];
}
