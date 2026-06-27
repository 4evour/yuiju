# 技术方案

## 要解决的问题

新增「玩手机」功能。当前只实现「云旅游」这一种手机功能。

执行「玩手机」时，Action 选择结果里只有 reason，代码本身不知道这次要怎么使用手机。为了把模糊 reason 转成 Hermes Agent 可以执行的任务，需要先由 Yuiju 调用一次 LLM 生成 Hermes user prompt，再调用 Hermes Agent 执行云旅游。

Hermes Agent 的调用成本较高，并且结构化文本不够可靠，因此 Hermes Agent 只返回纯文本。成功时返回悠酱口吻的云旅游描述；失败时返回符合“手机应用程序异常”设定的描述。

## 主流程

```text
World Tick 选择「玩手机」
→ Action reason 说明这次想用手机做什么
→ Yuiju 调用 LLM，把 reason 改写成 Hermes Agent 的云旅游 user prompt
→ Yuiju 拼接 Hermes Agent system prompt 和 user prompt
→ Hermes Agent 使用 mapillary skill 执行云旅游
→ Hermes Agent 返回纯文本
→ Action executor 扣除手机电量
→ Action completion 使用 Hermes 返回文本
→ 按现有 Action lifecycle 写入行为历史/记忆
```

Yuiju 不解析 Hermes 返回文本，不要求 Hermes 返回 JSON，也不在 Hermes 之后追加二次口吻生成。

## 职责边界

### Action

「玩手机」是世界模拟中的 Action。

Action 侧负责：

- 判断手机电量是否足够。
- 读取 Action reason。
- 调用 Yuiju LLM 生成 Hermes user prompt。
- 调用 Hermes Agent。
- 扣除手机电量。
- 将 Hermes 返回文本作为 completion 内容。

Action 侧不负责直接执行 Mapillary 查询，也不在代码里硬编码云旅游的图片分析细节。

### Yuiju LLM

Yuiju LLM 只负责把 Action reason 改写成一次 Hermes Agent user prompt。

当前只支持云旅游，所以不设计通用手机功能枚举，不设计多种结果类型，也不设计复杂 Planner schema。

输出可以是纯文本，例如：

```text
请随机进行一次日本云旅游。你需要使用可用的 Mapillary skill 获取日本街景图片，观察图片内容，然后用悠酱的口吻描述她看到的景色和感受。
如果手机应用、地图加载或街景获取失败，请不要暴露工具、脚本、API 或错误堆栈，只用“手机应用程序崩溃了”“地图应用没有加载出来”等符合手机设定的方式描述失败。
```

### Hermes Agent

Hermes Agent 是悠酱手机里的能力执行器。

Hermes Agent 负责：

- 根据 Yuiju 生成的 user prompt 调用 skill。
- 使用 `packages/source/skills/mapillary/SKILL.md` 获取云旅游街景素材。
- 根据图片内容生成最终文本。
- 失败时把工具或应用失败转成手机设定内的自然描述。

Hermes Agent 不直接修改 Redis、MongoDB、Character 状态或 MemoryEpisode。

### Skill

Skill 只描述外部能力怎么使用。

`packages/source/skills/mapillary/SKILL.md` 只负责说明如何获取日本街景图片数据、返回结构和图片使用规则。Skill 不写悠酱人设，不承担世界状态变化。

## Hermes Prompt 组成

Yuiju 调用 Hermes Agent 时，需要区分 `system prompt` 和 `user prompt`。

`system prompt` 放稳定约束：

- 你是悠酱手机里的能力执行器。
- 你可以使用已提供的 skill 完成手机应用功能。
- 悠酱基础人设 `baseInformation`。
- 你最终只返回一段自然文本。
- 不要暴露 Hermes Agent、skill、Python、shell、HTTP、API、schema、stack trace 等工程概念。
- 如果应用或 skill 执行失败，要维持“手机”设定，用手机应用异常的方式描述。

其中悠酱人设只使用 `packages/utils/src/prompt/character-card.ts` 中的 `baseInformation`。不注入 `characterPersonalityPrompt`。

`user prompt` 放本次任务，由 Yuiju LLM 根据 Action reason 生成，例如：

```text
请随机进行一次日本云旅游。你需要使用可用的 Mapillary skill 获取日本街景图片，观察图片内容，然后用悠酱的口吻描述她看到的景色和感受。
```

## Hermes 返回文本

Hermes Agent 只返回纯文本。

成功示例：

```text
像是走到一条很安静的旧街道上了。路边的房子离得很近，天色有点灰，如果真的在那里，我大概会慢慢走一会儿。
```

失败示例：

```text
手机里的地图应用好像突然崩溃了，这次没能看到街景。
```

失败时不伪造成成功云旅游；Action completion 直接使用失败文本。

## 手机电量

手机电量是 Character 实时状态的一部分，Redis 是真相源。

电量使用百分比表示，符合真实手机的表达方式：

- 初始电量为 100%。
- 每次执行「玩手机」消耗 30%。
- 「玩手机」前置条件为手机电量大于等于 30%。
- 执行三次后电量从 100% 变为 10%，下一次不满足「玩手机」前置条件，需要充电。
- 「给手机充电」完成后电量恢复到 100%。

Hermes 调用失败、skill 执行失败或手机应用失败，都表示这次已经尝试玩手机，因此仍消耗 30% 电量。

## Action 设计

### 玩手机

前置条件：

- 手机电量大于等于 30%。

执行副作用：

- 调用 Yuiju LLM 生成 Hermes user prompt。
- 调用 Hermes Agent。
- 手机电量减少 30%。
- 生成行为完成事件。

完成事件：

- 使用 Hermes 返回的纯文本。

### 给手机充电

前置条件：

- 角色位于家中。
- 手机电量小于 100%。

执行副作用：

- 手机电量恢复到 100%。
- 生成充电完成事件。

## 配置

新增 Hermes Agent 配置应进入根目录 `yuiju.config.ts`，不新增分散的隐式配置来源。

配置项只表达外部服务连接信息：

- Hermes Agent base url。
- Hermes Agent api key。
- Hermes Agent model 名称如有需要也放在同一配置边界内。

调用方式使用 OpenAI-compatible API。Hermes Agent 的 API 兼容 OpenAI chat completions。

## Prompt 维护

新增 prompt 文案集中放在 `@yuiju/utils/src/prompt/`。

建议包含：

- reason 到 Hermes user prompt 的改写 prompt。
- Hermes 手机执行器 system prompt。

Prompt 写法遵守项目 Prompt 规范：

- 任务指令使用第二人称“你”。
- 人设事实使用现有 `baseInformation`。
- 不把 Action、schema、内部接口、脚本错误等工程概念暴露给最终文本。
- 失败时把工具错误转成手机设定内的自然描述。

## 副作用顺序

建议执行顺序：

```text
读取 Character 手机电量
→ precondition 判断电量是否大于等于 30%
→ Yuiju LLM 生成 Hermes user prompt
→ Hermes Agent 执行云旅游
→ 手机电量减少 30%
→ 使用 Hermes 返回文本生成 completion
→ 按现有 lifecycle 写入行为历史/记忆
```

## 不在本次范围

- 不实现 SNS、发帖、刷视频等其他手机功能。
- 不设计通用手机 App 框架。
- 不设计复杂 Planner schema。
- 不要求 Hermes 返回结构化 JSON。
- 不让 skill 直接包含悠酱人设。
- 不让 Hermes Agent 直接写 Redis、MongoDB 或 MemoryEpisode。
- 不改变现有 Action lifecycle 和 MemoryEpisode 主流程。
