import {
  BusinessDistrictSubScene,
  CoastAreaSubScene,
  HomeSubScene,
  MajorScene,
  ParkAreaSubScene,
  SchoolSubScene,
} from "../types/state";

export type WorldMapMajorPlaceId =
  | "HOME"
  | "SCHOOL"
  | "BUSINESS_DISTRICT"
  | "PARK_AREA"
  | "COAST_AREA";

export type WorldMapMinorPlaceId =
  | "HOUSE"
  | "CAMPUS"
  | "SHOP"
  | "SUPERMARKET"
  | "DINER"
  | "CAFE"
  | "PARK"
  | "POND"
  | "SHRINE"
  | "BEACH";

export interface WorldMapPlace<TPlaceId extends string> {
  id: TPlaceId;
  name: string;
}

export interface WorldMapLink<TPlaceId extends string> {
  from: TPlaceId;
  to: TPlaceId;
  timeMinutes: number;
  stamina: number;
  satiety?: number;
  dir: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
}

export const worldMapMajorPlaces: WorldMapPlace<WorldMapMajorPlaceId>[] = [
  { id: "HOME", name: MajorScene.Home },
  { id: "SCHOOL", name: MajorScene.School },
  { id: "BUSINESS_DISTRICT", name: MajorScene.BusinessDistrict },
  { id: "PARK_AREA", name: MajorScene.ParkArea },
  { id: "COAST_AREA", name: MajorScene.CoastArea },
];

const worldMapMajorPlaceIdByScene = {
  [MajorScene.Home]: "HOME",
  [MajorScene.School]: "SCHOOL",
  [MajorScene.BusinessDistrict]: "BUSINESS_DISTRICT",
  [MajorScene.ParkArea]: "PARK_AREA",
  [MajorScene.CoastArea]: "COAST_AREA",
} satisfies Record<MajorScene, WorldMapMajorPlaceId>;

export const worldMapMajorLinks: WorldMapLink<WorldMapMajorPlaceId>[] = [
  { from: "HOME", to: "SCHOOL", timeMinutes: 30, stamina: -7, satiety: -4, dir: "N" },
  { from: "SCHOOL", to: "HOME", timeMinutes: 30, stamina: -7, satiety: -4, dir: "S" },

  { from: "HOME", to: "BUSINESS_DISTRICT", timeMinutes: 20, stamina: -5, satiety: -3, dir: "NE" },
  { from: "BUSINESS_DISTRICT", to: "HOME", timeMinutes: 20, stamina: -5, satiety: -3, dir: "SW" },

  { from: "SCHOOL", to: "BUSINESS_DISTRICT", timeMinutes: 10, stamina: -3, satiety: -2, dir: "E" },
  { from: "BUSINESS_DISTRICT", to: "SCHOOL", timeMinutes: 10, stamina: -3, satiety: -2, dir: "W" },

  { from: "HOME", to: "PARK_AREA", timeMinutes: 10, stamina: -3, satiety: -2, dir: "S" },
  { from: "PARK_AREA", to: "HOME", timeMinutes: 10, stamina: -3, satiety: -2, dir: "N" },

  {
    from: "BUSINESS_DISTRICT",
    to: "COAST_AREA",
    timeMinutes: 30,
    stamina: -7,
    satiety: -5,
    dir: "E",
  },
  {
    from: "COAST_AREA",
    to: "BUSINESS_DISTRICT",
    timeMinutes: 30,
    stamina: -7,
    satiety: -5,
    dir: "W",
  },
];

export const worldMapMinorPlacesByMajor: Record<
  WorldMapMajorPlaceId,
  WorldMapPlace<WorldMapMinorPlaceId>[]
> = {
  HOME: [{ id: "HOUSE", name: HomeSubScene.House }],
  SCHOOL: [{ id: "CAMPUS", name: SchoolSubScene.Campus }],
  BUSINESS_DISTRICT: [
    { id: "SHOP", name: BusinessDistrictSubScene.Shop },
    { id: "SUPERMARKET", name: BusinessDistrictSubScene.Supermarket },
    { id: "DINER", name: BusinessDistrictSubScene.Diner },
    { id: "CAFE", name: BusinessDistrictSubScene.Cafe },
  ],
  PARK_AREA: [
    { id: "PARK", name: ParkAreaSubScene.Park },
    { id: "POND", name: ParkAreaSubScene.Pond },
    { id: "SHRINE", name: ParkAreaSubScene.Shrine },
  ],
  COAST_AREA: [{ id: "BEACH", name: CoastAreaSubScene.Beach }],
};

export const worldMapMinorLinksByMajor: Record<
  WorldMapMajorPlaceId,
  WorldMapLink<WorldMapMinorPlaceId>[]
> = {
  HOME: [],
  SCHOOL: [],
  BUSINESS_DISTRICT: [
    { from: "SHOP", to: "SUPERMARKET", timeMinutes: 5, stamina: -1, satiety: -1, dir: "E" },
    { from: "SUPERMARKET", to: "SHOP", timeMinutes: 5, stamina: -1, satiety: -1, dir: "W" },
    { from: "SUPERMARKET", to: "DINER", timeMinutes: 5, stamina: -1, satiety: -1, dir: "E" },
    { from: "DINER", to: "SUPERMARKET", timeMinutes: 5, stamina: -1, satiety: -1, dir: "W" },
    { from: "DINER", to: "CAFE", timeMinutes: 5, stamina: -1, satiety: -1, dir: "E" },
    { from: "CAFE", to: "DINER", timeMinutes: 5, stamina: -1, satiety: -1, dir: "W" },
  ],
  PARK_AREA: [
    { from: "PARK", to: "POND", timeMinutes: 10, stamina: -3, satiety: -2, dir: "SE" },
    { from: "POND", to: "PARK", timeMinutes: 10, stamina: -3, satiety: -2, dir: "NW" },
    { from: "PARK", to: "SHRINE", timeMinutes: 10, stamina: -3, satiety: -2, dir: "S" },
    { from: "SHRINE", to: "PARK", timeMinutes: 10, stamina: -3, satiety: -2, dir: "N" },
  ],
  COAST_AREA: [],
};

function buildWorldMapDsl<TPlaceId extends string>(
  places: WorldMapPlace<TPlaceId>[],
  links: WorldMapLink<TPlaceId>[],
) {
  return [
    ...places.map((place) => `place ${place.id} "${place.name}"`),
    "",
    ...links.map((link) => {
      const details = [
        `timeMinutes=${link.timeMinutes}`,
        `stamina=${link.stamina}`,
        ...(link.satiety !== undefined ? [`satiety=${link.satiety}`] : []),
        `dir=${link.dir}`,
      ];

      return `link ${link.from} -> ${link.to} (${details.join(", ")})`;
    }),
  ].join("\n");
}

export const worldMapDslGuide = `
地图说明：
- major map 表示小镇区域之间的移动关系。
- minor map 表示当前区域内部具体地点之间的移动关系。
- link A -> B 表示可以从 A 直接移动到 B。
- dir 表示从 A 到 B 的方向。
- timeMinutes 表示移动耗时。
- stamina 和 satiety 表示移动后的数值变化。
- 移动行为只能在候选 action 中选择，不能自行创造路径。
`.trim();

export const worldMapMajorDsl = buildWorldMapDsl(worldMapMajorPlaces, worldMapMajorLinks);

export function getWorldMapMinorDsl(major: WorldMapMajorPlaceId) {
  return buildWorldMapDsl(worldMapMinorPlacesByMajor[major], worldMapMinorLinksByMajor[major]);
}

export function getWorldMapMajorPlaceId(major: MajorScene) {
  return worldMapMajorPlaceIdByScene[major];
}

export function worldMapDsl(major: WorldMapMajorPlaceId) {
  return `
${worldMapDslGuide}

major map:
${worldMapMajorDsl}

minor map in ${major}:
${getWorldMapMinorDsl(major)}
`.trim();
}

/**
 * 给人看的，不是给 LLM 看的
 */
export const worldMapTerminalUi = `
             ┌────────────┐
             │ 星见丘高校 │
             └─────┬──────┘
                   │
                   │
               ┌───┴────┐
               │ 商业区  │──────┌────────┐
               │商店/超市│      │  海岸  │
               │食堂/咖啡│
               └───┬────┘──────└────────┘
                   │
               ┌───┴────┐
               │   家   │
               └───┬────┘
                   │
               ┌───┴────┐
               │公园周边 │
               │公园/池/社│
               └────────┘
`.trim();

export const worldMapPlaces = worldMapMajorPlaces;
export const worldMapLinks = worldMapMajorLinks;
