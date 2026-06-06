---
name: yuiju-action-change
description: 指导 Yuiju 项目中的 Action 相关改动。修改、新增、删除、重命名或审查 Action 行为时使用。
---

# Yuiju Action Change

使用这个技能时，要确保 Yuiju 的 Action 改动在世界模拟、prompt、状态、记忆和展示入口之间保持一致。

## 开始步骤

1. 遵守仓库 `AGENTS.md`：写代码前先说明技术方案，并等待用户确认。
2. 只读取本次改动需要的规则文件：
   - 所有代码改动读 `docs/rules/implementation-style.md`。
   - 涉及 Action、Scene、Character、World、Memory、Plan、Message 或 API 行为时读 `docs/rules/domain-design-style.md`。
   - 修改 prompt 文案或 LLM 可见描述时读 `docs/rules/prompt-style.md`。
3. 优先使用 `rg` 搜索，不要大范围手动翻文件。常用搜索：
   - `rg -n "ActionId|ActionMetadata|precondition|durationMin|completionEvent|setAction" packages`
   - `rg -n "<action-name-or-route>" packages`

## 核心文件

Action 改动时始终考虑这些文件：

- `packages/utils/src/types/action.ts`：`ActionId`、`ActionMetadata`、agent 决策结构。
- `packages/world/src/action/<scene>/*.ts`：具体 Action metadata、前置条件、执行器、耗时、完成事件。
- `packages/world/src/action/<scene>/index.ts`：场景级 Action 导出。
- `packages/world/src/action/index.ts`：全局 Action 列表和候选过滤。
- `packages/world/src/action/utils.ts`：`getActionById`、预检 Action、共享时间判断。
- `packages/world/src/engine/action-lifecycle.ts`：开始、running 状态、耗时、完成、记忆写入。
- `packages/world/src/llm/agent/action.ts`：Action 选择的 structured output schema。
- `packages/utils/src/prompt/world-view.ts`：Action 选择 prompt 和候选列表格式。

## 按改动类型检查

只改耗时时：

- 修改具体 Action 的 `durationMin`。
- 如果 `description` 提到耗时，同步修改文案。
- 如果是移动行为，同步修改 `packages/utils/src/prompt/world-map.ts` 里的 `timeMinutes`。
- 不要顺手修改未被要求的体力、饱腹、心情、金币或路线结构。

修改移动或地点时：

- 检查源地点和目标地点 Action executor 中的 `setLocation`。
- 新增或重命名区域/子地点时检查 `packages/utils/src/types/state.ts`。
- 更新 `packages/utils/src/prompt/world-map.ts` 中的路线结构、方向、耗时、体力和饱腹。
- 更新 `packages/utils/src/prompt/world-guide.ts` 中的地点介绍和 `availableActions`。
- 显式检查反向路线，不要默认认为一定存在。

新增 Action 时：

- 在 `packages/utils/src/types/action.ts` 增加 `ActionId`。
- 在正确的场景文件中增加具体 `ActionMetadata`。
- 如有需要，通过场景 `index.ts` 和全局 Action 列表导出。
- 写清楚 `precondition`。
- 让 executor 的副作用保持可见：当前 action、位置、属性、背包、金币、计划或记忆相关状态。
- 设置 `durationMin`；只有真正需要由本次决策决定时长时，才使用动态耗时。
- 结束时需要结算或生成事件叙述时，增加 `completionEvent`。
- 如果 Action 应该出现在静态世界指引中，同步更新 prompt、地图或 guide。

删除或重命名 Action 时：

- 搜索所有 `ActionId.<Name>` 引用和 action 字符串引用。
- 更新 `world-guide.ts`、`world-map.ts`、预检映射、LLM prompt、记忆构建、UI/API 展示和相关测试。
- 重命名前考虑 Redis/Mongo 中已经持久化的记录。不要自行加入兼容 fallback；如果涉及迁移，先向用户说明并确认。

修改 Action 副作用时：

- 立即发生的副作用放在 `executor`。
- 等待结束后发生的结算放在 `completionEvent`。
- `startContext` 只保存完成结算确实需要的数据。
- 新上下文需要进入行为历史时，检查 `packages/world/src/memory/episode-builder.ts`。
- 修改 `proactiveShare` 或完成时分享素材时，检查 `packages/world/src/engine/proactive-message.ts`。
