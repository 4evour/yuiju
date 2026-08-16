import { MajorScene } from "@yuiju/utils/types/major-scene";
import { MOON_TIDE_COAST_SCENE_KEY } from "../../scene";

export const WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT = "world-map-character-location-change";
export const WORLD_MAP_MESSAGE_EVENT = "world-map-message";
export const WORLD_MAP_UNAVAILABLE_MESSAGE = "该区域的二级场景暂未开放";
export const WORLD_MAP_TAP_MAX_DISTANCE = 8;

export const WORLD_MAP_REGIONS = [
  {
    majorScene: MajorScene.School,
    name: "星见丘高校",
    labelX: 340,
    labelY: 190,
    interactionX: 340,
    interactionY: 180,
    interactionWidth: 270,
    interactionHeight: 240,
    secondarySceneKey: null,
  },
  {
    majorScene: MajorScene.BusinessDistrict,
    name: "羽浦商店街",
    labelX: 690,
    labelY: 280,
    interactionX: 690,
    interactionY: 220,
    interactionWidth: 320,
    interactionHeight: 160,
    secondarySceneKey: null,
  },
  {
    majorScene: MajorScene.Home,
    name: "汐风里",
    labelX: 420,
    labelY: 520,
    interactionX: 400,
    interactionY: 450,
    interactionWidth: 360,
    interactionHeight: 180,
    secondarySceneKey: null,
  },
  {
    majorScene: MajorScene.ParkArea,
    name: "南风公园",
    labelX: 480,
    labelY: 570,
    interactionX: 480,
    interactionY: 640,
    interactionWidth: 340,
    interactionHeight: 180,
    secondarySceneKey: null,
  },
  {
    majorScene: null,
    name: "结灯神社",
    labelX: 850,
    labelY: 430,
    interactionX: 850,
    interactionY: 500,
    interactionWidth: 280,
    interactionHeight: 360,
    secondarySceneKey: null,
  },
  {
    majorScene: MajorScene.CoastArea,
    name: "月汐海岸",
    labelX: 1142,
    labelY: 412,
    interactionX: 1142,
    interactionY: 458,
    interactionWidth: 96,
    interactionHeight: 120,
    secondarySceneKey: MOON_TIDE_COAST_SCENE_KEY,
  },
] as const;
