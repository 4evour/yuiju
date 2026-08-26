# LLM 协定

项目把 LLM 当作决策和文本生成能力，而不是状态真相源。修改模型调用、Prompt 或 structured output 前，需要先确认代码与模型各自负责什么。

## 职责边界

| LLM 可以做 | 业务代码必须做 |
| --- | --- |
| 从候选 Action 中选择行为 | 过滤候选行为并执行状态变化 |
| 生成私聊、群聊和主动分享文本 | 判断发送时机、目标和平台 |
| 整理日记、摘要和人物记忆 | 保存原始事件并决定何时沉淀记忆 |
| 从上下文提取结构化结果 | 校验结果并执行数据库、文件或外部调用 |

LLM 不能直接修改 Redis、MongoDB、文件或外部平台状态。所有副作用都要由调用它的业务流程显式完成。

## Prompt 放在哪里

Prompt 统一维护在 `@yuiju/utils/src/prompt/`：

- 无参数的静态 Prompt 导出为常量。
- 业务包只负责组合运行时上下文、选择模型并发起调用。
- structured output schema 的字段说明要和 Prompt 使用同一视角与术语。
- 图片、音频和数据集仍放在 `@yuiju/source`，不作为 Prompt 的维护入口。

## 用户可修改的提示词

Web 管理页允许覆盖五类文本：

- `character`：角色身份、背景和稳定事实。
- `world`：世界边界、人物关系、地点和设备说明。
- `chat`：聊天人格、关系处理和表达方式。
- `chooseAction`：行为选择偏好。
- `diary`：每日日记的写作规则。

代码中的文本是默认值，MongoDB 的 `prompt_customization` collection 只保存用户覆盖值。没有记录时使用代码默认值；数据库读取失败应直接暴露错误，不能当成“没有覆盖”。

用户覆盖只替换对应静态文本，不会改变 Action 候选、`precondition`、状态副作用、消息结构、工具规则、计划规则、schema 或运行时上下文。

目前聊天回复、Action 选择、每日日记和阶段日记已经接入这些覆盖值，其他 LLM 任务仍使用代码中的 Prompt。

## World 决策

World 中的调用顺序是：

1. 代码读取 World、Character 状态和历史记录。
2. Action 的 `precondition` 过滤候选行为。
3. LLM 只能从候选列表中选择，并返回原因、参数和计划变化建议。
4. Action executor 执行真实状态变化并写入记录。
5. 后续流程决定是否生成记忆、日记或主动分享。

不要让模型绕过候选列表，直接声明角色已经完成某个行为。

## Message 生成

消息进入 LLM 前，业务代码已经完成平台消息标准化、白名单判断和上下文构造。LLM 只生成最终表达。

- 回复中不能暴露 Action、schema、字段名或内部事件等工程概念。
- 群聊新消息取消旧请求后，旧请求不能继续发送回复。
- 表情包只能引用 `message.stickers` 中声明的稳定 key。
- 是否发送、发送到哪里以及是否写回历史，由 handler 和 adapter 控制。

## Memory 与 Diary

- `MemoryEpisode` 是可追溯的经历事实。
- Diary 是根据 Episode 生成的叙事归档，不替代 Episode。
- Graphiti 只负责长期记忆图谱写入和检索，不判断事件是否发生。
- 用户记忆、计划记忆和图谱记忆的写入时机由 TypeScript 业务流程决定。

## 模型配置

模型来源配置在 `yuiju.config.json` 的 `llm.models`：

- `chat`：对话生成。
- `strong`：复杂决策和长链路推理。
- `flash`：快速文本任务。
- `vision`：图片理解。

每类模型可以按顺序配置多个 OpenAI-compatible source。调用失败时，模型模块会尝试下一个来源，并暂时冷却失败来源。

## 修改前检查

- 模型是否只负责决策或生成，没有直接执行副作用？
- Prompt、schema 和业务代码是否使用一致的字段含义？
- 生成内容是否可能泄露内部工程概念？
- 新产生的事实是否落在明确的状态或记录中？
- 是否保留了 Action precondition、白名单和配置边界？
