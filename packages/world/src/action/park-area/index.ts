import { parkAction } from "./park";
import { pondAction } from "./pond";
import { shrineAction } from "./shrine";

export const parkAreaAction = parkAction.concat(pondAction, shrineAction);
