import { cafeAction } from "./cafe";
import { shopAction } from "./shop";

export const businessDistrictAction = shopAction.concat(cafeAction);
