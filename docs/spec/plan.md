# 代码实现

## 实现目标

本次改动把地点从扁平地点列表迁移为 `major` 区域与 `minor` 具体地点两层结构，并让 action 模块按地点层级组织。

实现后：

- `location.major` 表示区域。
- `location.minor` 表示区域内具体地点。
- 移动行为始终发生在完整地点之间，即 `major-minor -> major-minor`。
- `packages/world/src/action/index.ts` 不再按 `major` 分发 action，只汇总全部 action 并执行 `precondition` 过滤。
- 每个 action 在自己的 `precondition` 中判断当前地点。

## 代码结构调整

`packages/world/src/action` 按 `major/minor` 层级重组：

```txt
packages/world/src/action/
  index.ts
  anywhere.ts
  utils.ts
  home/
    index.ts
    house.ts
  school/
    index.ts
    campus.ts
  business-district/
    index.ts
    shop.ts
    cafe.ts
  park-area/
    index.ts
    park.ts
    shrine.ts
  coast-area/
    index.ts
    beach.ts
```

目录语义：

- 每个 `major` 一个目录。
- 每个 `minor` 一个 action 文件。
- `minor` 文件内放置“当前位置为该 minor 时可执行”的行为，包括地点互动行为和从该地点出发的移动行为。
- `major/index.ts` 只负责合并该区域下所有 `minor` 的 action。
- 根 `action/index.ts` 只负责合并所有区域 action、`anywhereAction`，并统一执行 `precondition`。

旧文件迁移关系：

- `home.ts` -> `home/house.ts`
- `school.ts` -> `school/campus.ts`
- `shop.ts` -> `business-district/shop.ts`
- `cafe.ts` -> `business-district/cafe.ts`
- `park.ts` -> `park-area/park.ts`
- `shrine.ts` -> `park-area/shrine.ts`
- `coast.ts` -> `coast-area/beach.ts`

## 地点类型调整

在 `packages/utils/src/types/state.ts` 中调整地点枚举：

- `MajorScene.Home` / 家
- `MajorScene.School` / 星见丘高校
- `MajorScene.BusinessDistrict` / 商业区
- `MajorScene.ParkArea` / 公园周边
- `MajorScene.CoastArea` / 海岸

`minor` 拆分：

- `HomeSubScene.House` / 屋内
- `SchoolSubScene.Campus` / 校园
- `BusinessDistrictSubScene.Shop` / 小町商店
- `BusinessDistrictSubScene.Cafe` / 薄暮咖啡
- `ParkAreaSubScene.Park` / 南风公园
- `ParkAreaSubScene.Shrine` / 结灯神社
- `CoastAreaSubScene.Beach` / 月汐海岸

`Location` 类型继续使用判别联合，要求每个 `major` 对应自己的 `minor` 枚举。

初始位置调整为：

```ts
{ major: MajorScene.Home, minor: HomeSubScene.House }
```

## 地图 DSL 调整

`packages/utils/src/prompt/world-map.ts` 拆成两层地图事实源：

- `major` 区域地图：描述区域之间的方位、耗时和消耗。
- 按 `major` 分组的 `minor` 局部地图：描述当前区域内部具体地点之间的方位、耗时和消耗。

建议导出：

- `worldMapMajorPlaces`
- `worldMapMajorLinks`
- `worldMapMinorPlacesByMajor`
- `worldMapMinorLinksByMajor`
- `worldMapMajorDsl`
- `getWorldMapMinorDsl(major)`

给 Agent 的 prompt 中：

- 始终提供 `worldMapMajorDsl`。
- 只提供当前 `major` 下的 `minor` DSL。
- DSL 前保留少量自然语言规则说明，用来解释 `major map`、`minor map`、`link`、`dir`、`timeMinutes`、`stamina`、`satiety` 的含义。

## 移动行为规则

移动 action 的执行结果必须写入完整 `Location`。

例如：

```ts
{ major: MajorScene.BusinessDistrict, minor: BusinessDistrictSubScene.Cafe }
```

跨 `major` 移动：

- 耗时和消耗读取对应的 `major` 区域关系。
- 目标 `minor` 不影响跨区域耗时和消耗。
- 例如 `HOME-HOUSE -> BUSINESS_DISTRICT-SHOP` 与 `HOME-HOUSE -> BUSINESS_DISTRICT-CAFE` 的耗时和消耗相同。

同一 `major` 内移动：

- 使用当前 `major` 下的 `minor` 局部关系。
- 例如 `BUSINESS_DISTRICT-SHOP -> BUSINESS_DISTRICT-CAFE` 使用商业区内部关系。

本阶段不做自动寻路。长距离移动仍通过多轮相邻移动完成。

## Action 迁移规则

地点互动行为迁移后需要显式判断完整位置。

示例：

- `Buy_Item_At_Shop` 只在 `BUSINESS_DISTRICT-SHOP` 可执行。
- `Order_Coffee`、`Work_At_Cafe` 只在 `BUSINESS_DISTRICT-CAFE` 可执行。
- `Walk_In_Park` 只在 `PARK_AREA-PARK` 可执行。
- `Pray_At_Shrine` 只在 `PARK_AREA-SHRINE` 可执行。
- `Walk_In_Coast` 只在 `COAST_AREA-BEACH` 可执行。
- `Study_At_School` 只在 `SCHOOL-CAMPUS` 可执行。
- 家中吃饭、睡觉、做饭类行为只在 `HOME-HOUSE` 可执行。

移动行为放在出发地点对应的 `minor` 文件中。

例如：

- 从 `HOME-HOUSE` 出发的移动行为放在 `home/house.ts`。
- 从 `BUSINESS_DISTRICT-SHOP` 出发的移动行为放在 `business-district/shop.ts`。
- 从 `BUSINESS_DISTRICT-CAFE` 出发的移动行为放在 `business-district/cafe.ts`。

## ActionId 策略

第一版优先复用现有 `ActionId`，减少行为历史、记忆和 prompt 的联动改动。

现有移动 action 的语义按新地点模型更新：

- `Go_To_Shop_From_Home`：`HOME-HOUSE -> BUSINESS_DISTRICT-SHOP`
- `Go_To_Cafe_From_Home`：`HOME-HOUSE -> BUSINESS_DISTRICT-CAFE`
- `Go_To_Shop_From_School`：`SCHOOL-CAMPUS -> BUSINESS_DISTRICT-SHOP`
- `Go_To_Cafe_From_School`：`SCHOOL-CAMPUS -> BUSINESS_DISTRICT-CAFE`
- `Go_Home_From_Shop`：`BUSINESS_DISTRICT-SHOP -> HOME-HOUSE`
- `Go_Home_From_Cafe`：`BUSINESS_DISTRICT-CAFE -> HOME-HOUSE`
- `Go_To_School_From_Shop`：`BUSINESS_DISTRICT-SHOP -> SCHOOL-CAMPUS`
- `Go_To_School_From_Cafe`：`BUSINESS_DISTRICT-CAFE -> SCHOOL-CAMPUS`
- `Go_To_Coast_From_Shop`：`BUSINESS_DISTRICT-SHOP -> COAST_AREA-BEACH`
- `Go_To_Shop_From_Coast`：`COAST_AREA-BEACH -> BUSINESS_DISTRICT-SHOP`
- `Go_To_Shrine_From_Park`：`PARK_AREA-PARK -> PARK_AREA-SHRINE`
- `Go_To_Park_From_Shrine`：`PARK_AREA-SHRINE -> PARK_AREA-PARK`

需要补齐目前缺失但地图语义上成立的移动 action：

- `BUSINESS_DISTRICT-CAFE -> COAST_AREA-BEACH`
- `COAST_AREA-BEACH -> BUSINESS_DISTRICT-CAFE`

因为跨 `major` 移动的耗时和消耗只由区域关系决定，目标区域内任意 `minor` 都可以作为落点，所以商业区与海岸相邻时，商业区内的 `SHOP` 与 `CAFE` 都应能前往 `COAST_AREA-BEACH`，海岸也应能返回商业区内的 `SHOP` 或 `CAFE`。

## 实施顺序

1. 调整 `Location`、`MajorScene` 与各 `SubScene` 类型。
2. 调整默认角色位置为 `HOME-HOUSE`。
3. 重构 `world-map.ts`，拆出 `major` DSL 与按 `major` 分组的 `minor` DSL。
4. 重组 `packages/world/src/action` 目录。
5. 迁移各地点互动 action，并把地点判断写入自己的 `precondition`。
6. 迁移移动 action，确保每个 executor 写入完整 `major/minor`。
7. 简化 `packages/world/src/action/index.ts`，移除外层 `major` switch。
8. 更新引用旧 `MajorScene.Shop`、`MajorScene.Cafe`、`MajorScene.Park`、`MajorScene.Shrine`、`MajorScene.Coast` 的代码。
9. 检查 prompt、记忆、状态日志中地点展示是否仍然能显示 `major-minor`。
10. 执行验证命令。

## 不处理范围

重构期间不处理 `@yuiju/web` 模块。即使 Web 模块存在旧地点枚举、旧地点展示或类型错误，也不在本次改动范围内修正。

## 验证

完成实现后执行：

```bash
pnpm run format:write
pnpm run lint
pnpm run type-check
```

如果过程中发现单包类型错误集中在 `@yuiju/world` 或 `@yuiju/utils`，可以先运行对应包的 type-check，再回到完整检查。
