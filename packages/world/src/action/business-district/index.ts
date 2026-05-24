import { cafeAction } from "./cafe";
import { dinerAction } from "./diner";
import { shopAction } from "./shop";
import { supermarketAction } from "./supermarket";

export const businessDistrictAction = shopAction.concat(supermarketAction, dinerAction, cafeAction);
