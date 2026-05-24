import type { ActionContext, ActionMetadata } from "@yuiju/utils";
import { anywhereAction } from "./anywhere";
import { businessDistrictAction } from "./business-district";
import { coastAction } from "./coast-area";
import { homeAction } from "./home";
import { parkAreaAction } from "./park-area";
import { schoolAction } from "./school";
import { precheckAction } from "./utils";

const allLocationAction: ActionMetadata[] = [
  ...homeAction,
  ...schoolAction,
  ...businessDistrictAction,
  ...parkAreaAction,
  ...coastAction,
];

export function getActionList(context: ActionContext) {
  // 优先预检，服务于特定的 Action
  const actionList = precheckAction(context);
  if (actionList) {
    return actionList;
  }

  return allLocationAction.concat(anywhereAction).filter((action) => {
    return action.precondition(context);
  });
}
