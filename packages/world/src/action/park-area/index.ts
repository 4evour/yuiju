import { parkAction } from "./park";
import { shrineAction } from "./shrine";

export const parkAreaAction = parkAction.concat(shrineAction);
