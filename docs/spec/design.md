# 技术方案

## 本次要解决的问题

聊天消息会即时影响角色心情：

- 看到夸赞表达时，心情 +1。
- 看到不礼貌、攻击性、羞辱性或恶意行为时，心情 -1。
- 群聊里所有人之间的互相评价都会影响心情，因为角色看到不好的事情也会心情变差。
- 每条消息的心情变化幅度固定为 -1、 +1，没有心情变化不输出这个字段。
- 聊天消息导致的心情降低有最低值 30，降到最低值后不能继续减少。
- 心情差时，不回复当前表现不礼貌的人。

聊天窗口归档时，需要统计本窗口内所有心情变化，并把统计结果写入数据库，作为可追溯的聊天经历记录。

## 预计修改范围

- `packages/message/src/handler/group-message.ts`
- `packages/message/src/handler/private-message.ts`
- `packages/message/src/llm/manager.ts`
- `packages/message/src/llm/chat-session-manager.ts`
- `packages/message/src/memory/episode-builder.ts`
- `packages/utils/src/prompt/message.ts`
- `packages/utils/src/redis/state/character.ts`

## 主流程变化

收到非自己发送的消息后，消息入口先把消息写入会话历史。

`chatWithLLM` / 群聊回复 LLM 在原有回复决策结构化输出中同时生成心情影响判断，不单独增加一次 LLM 调用。结构化输出增加：

- `moodDelta`: -1、1。

LLM 返回后，立即把 `moodDelta` 写入 Redis 中的角色实时状态。Redis 仍然是角色实时状态的真相源。`packages/utils/src/redis/state/character.ts` 新增一个聊天侧心情变化函数。

聊天侧处理 `moodDelta: -1` 时，如果当前心情已经小于或等于 30，则不再继续降低。这个最低值只约束聊天消息造成的心情降低，不影响世界行为中的 mood 变化规则。

写入会话窗口时，同时记录这条消息实际生效的心情变化。后续聊天窗口归档时，基于窗口内记录计算总变化值。

生成回复前，固定读取当前角色状态，并把心情、体力、饱腹等作为内部状态上下文注入聊天 user message prompt。模型可以据此调整回复状态。

如果当前心情较差，并且最新消息发送者表现不礼貌，悠酱可以选择不回复。

聊天窗口归档时，把窗口内心情变化汇总写入 `MemoryEpisode.summaryText`，本窗口心情总变化值

## 新增函数、类型、模块、配置或运行约定

在聊天回复 prompt 和 structured output schema 中增加心情影响判断要求，维护在 `@yuiju/utils/src/prompt/message.ts` 及消息 LLM 调用处。

新增消息侧使用的 mood 变更方法，负责读取当前 mood、应用 delta，并阻止聊天消息把心情继续降到 30 以下。

给聊天窗口状态增加心情变化记录，用于归档统计。

不新增配置项，不新增运行约定，不做通用情绪系统框架。

## 状态变化与副作用

每条消息可能写 Redis，更新 `Character.mood`。

聊天窗口归档时写 MongoDB，把心情变化统计沉淀到 `MemoryEpisode.summaryText`。

回复决策会受当前 mood 和最新消息礼貌性影响。

## 不在本次修改范围内

- 不改项目启动方式。
- 不做长期好感度、用户关系值或复杂情绪模型。
- 不把心情数值直接暴露给用户。
- 不重构消息会话管理之外的无关逻辑。
- 不新增分散配置项或隐藏环境变量。

## 待确认

心情差不做固定阈值判断，让 LLM 自己决定。聊天侧阻止心情继续降低的边界固定为 30。
