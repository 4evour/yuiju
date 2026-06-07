import type { WorldStateData } from "@yuiju/utils";
import type { WorldCommand } from "../command";

export interface WorldAdvanceContext {
  fromTime: Date;
  toTime: Date;
  deltaMs: number;
  worldStateData: WorldStateData;
  commands: WorldCommand[];
}

export abstract class WorldEvolution {
  abstract precondition(context: WorldAdvanceContext): boolean | Promise<boolean>;
  abstract advance(context: WorldAdvanceContext): Promise<WorldStateData>;
}
