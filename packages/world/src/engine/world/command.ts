import type { WorldSubScene } from "@yuiju/utils/types/state";

export type WorldCommand =
  | {
      type: "consume_scene_resource";
      scene: WorldSubScene;
      resource: string;
      amount: number;
    }
  | {
      type: "advance_summer_festival_preparation";
    }
  | {
      type: "hold_summer_festival";
      heldAt: string;
    };
