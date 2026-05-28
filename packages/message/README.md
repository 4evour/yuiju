# 消息服务 (@yuiju/message)

`@yuiju/message` 是悠酱项目的消息入口层，负责接收外部消息、调用 LLM 生成回复，并将对话记录写入持久化存储。

## 项目概述

这个子包主要解决“如何和悠酱对话”的问题，当前包含两种运行方式：

- 终端模式：本地快速调试对话逻辑
- 消息平台模式：接入 NapCat WebSocket，处理真实私聊消息

## 核心能力

- **消息接入**：监听私聊消息并抽取文本内容
- **LLM 对话**：调用 `llmManager` 生成回复内容
- **消息持久化**：将用户消息与助手回复写入 MongoDB
- **白名单控制**：通过配置限制可访问的用户范围

## 目录结构

```text
src/
├── server.ts                # 生产模式入口，连接 NapCat WebSocket
├── terminal.ts              # 开发模式入口，使用终端进行对话
├── demo.ts                  # 示例脚本
├── config.ts                # NapCat 与白名单配置
├── chat-session-manager.ts  # 会话管理
├── tts.ts                   # 语音相关逻辑
└── llm/
    └── manager.ts           # LLM 对话封装
```

## 依赖关系

- `@yuiju/utils`：统一配置读取、数据库连接、消息记录存储
- `@yuiju/source`：提示词与对话相关内容
- `node-napcat-ts`：NapCat WebSocket 客户端

## 项目配置

消息服务依赖根目录 `yuiju.config.ts` 中的以下配置：

- `database.mongoUri`
- `llm.deepseekApiKey`
- `message.napcat`
- `message.ownerList`
- `message.groupWhiteList`

首次使用时，先基于示例文件创建本地配置：

```bash
cp yuiju.config.ts.example yuiju.config.ts
```

额外说明：

- `NODE_ENV` 仍然是运行时环境变量，不在 `yuiju.config.ts` 中
- 终端调试模式不依赖 NapCat，但真实消息平台模式需要 `message.napcat` 可正常连接

## 运行命令

```bash
# 终端调试模式
pnpm run dev:message

# 示例脚本
pnpm run demo:message

# 生产模式
pnpm run start:message

# 类型检查
pnpm run type-check:message
```

## 使用说明

### 终端模式

适合本地快速验证对话链路，不依赖 NapCat。

```bash
pnpm run dev:message
```

### NapCat 模式

适合接入真实消息平台，启动前需要确保：

- NapCat 服务可连接
- `yuiju.config.ts` 中的 `message.napcat` 已正确配置
- `yuiju.config.ts` 中的 `llm.deepseekApiKey` 与 `database.mongoUri` 可用

```bash
pnpm run start:message
```

## 注意事项

- `server.ts` 会在启动时先连接 MongoDB，再连接 NapCat。
- 若未配置 `llm.deepseekApiKey`，消息服务会直接返回提示文案，不会继续调用模型。
- 开发环境建议优先使用 `terminal.ts`，排查问题更直接。
