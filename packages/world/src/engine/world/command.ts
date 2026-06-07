import type { WorldSubScene } from "@yuiju/utils";

export type WorldCommand = {
  type: "consume_scene_resource";
  scene: WorldSubScene;
  resource: string;
  amount: number;
};
