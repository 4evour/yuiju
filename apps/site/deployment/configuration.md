# 项目配置

yuiju 的业务配置统一来自仓库根目录的 `yuiju.config.ts`。各应用进程启动时加载这份配置，读取结果会被缓存并深度冻结，运行期间不会自动重新加载。

修改配置后，需要重启相关 PM2 进程才能生效。

## 创建配置文件

从示例文件开始配置：

```bash
cp yuiju.config.ts.example yuiju.config.ts
```

配置文件通过 `defineYuijuConfig` 获得 TypeScript 类型检查：

```ts
import { defineYuijuConfig } from './packages/utils/src/config/config-schema';

const config = defineYuijuConfig({
  app: {},
  database: {},
  llm: {},
  world: {},
  message: {},
});

export default config;
```

上面的空对象只用于展示顶层结构，不能直接运行。实际配置必须补齐下文列出的必填字段。

## `app`：应用配置

| 字段                   | 类型      | 必填 | 含义                                                                                                               |
| ---------------------- | --------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `app.publicDeployment` | `boolean` | 是   | 是否以公开展示模式运行 Web。设为 `true` 时，部分内部页面与写操作会被限制，活动、日记和首页状态改从同步数据源读取。 |
| `app.timezone`         | `string`  | 是   | 世界时间使用的 IANA 时区，例如 `Asia/Shanghai`。                                                                   |
| `app.memoryDir`        | `string`  | 是   | 文件型记忆的根目录。必须填写绝对路径，应用会在其下使用 `people`、`groups`、`core` 等子目录。                       |

普通自托管实例应使用：

```ts
app: {
  publicDeployment: false,
  timezone: "Asia/Shanghai",
  memoryDir: "/srv/yuiju-data/memory",
},
```

示例配置中的 `~/.local/share/yuiju/memory` 不应直接用于服务器部署；Node.js 不会在普通字符串中自动展开 `~`，请改为真实绝对路径。

## `database`：数据存储

| 字段                    | 类型     | 必填 | 含义                                                                                |
| ----------------------- | -------- | ---- | ----------------------------------------------------------------------------------- |
| `database.mongoUri`     | `string` | 是   | 主 MongoDB 连接地址，保存行为历史、消息、记忆和日记等记录。                         |
| `database.redisUrl`     | `string` | 是   | 主 Redis 连接地址，保存角色和世界实时状态。                                         |
| `database.syncMongoUri` | `string` | 否   | 同步 MongoDB 地址，供公开展示实例读取同步后的历史数据。                             |
| `database.syncRedisUrl` | `string` | 否   | 同步 Redis 地址，供公开展示实例读取同步后的实时状态，也可接收主实例的状态同步写入。 |

单实例部署示例：

```ts
database: {
  mongoUri: "mongodb://127.0.0.1:27017/yuiju",
  redisUrl: "redis://127.0.0.1:6379",
},
```

当 `app.publicDeployment` 为 `true` 时，Web 的相关查询会选择 `syncMongoUri` 和 `syncRedisUrl`，因此公开展示实例必须同时配置对应的同步数据源。

## `llm.models`：通用模型

`chat`、`strong`、`flash` 和 `vision` 都是非空模型源数组。每种模型至少配置一个来源，也可以按优先顺序配置多个来源。

当某个来源调用失败时，系统会尝试数组中的下一个来源，并让失败来源进入五分钟冷却。中止请求和被新群聊请求替换的任务不会触发来源切换。

| 字段                          | 类型            | 必填 | 含义                                                             |
| ----------------------------- | --------------- | ---- | ---------------------------------------------------------------- |
| `llm.models.chat`             | `ModelSource[]` | 是   | 对话、主动分享和部分记忆流程使用的模型来源。至少一项。           |
| `llm.models.strong`           | `ModelSource[]` | 是   | 角色 Action 选择等复杂决策使用的强模型来源。至少一项。           |
| `llm.models.flash`            | `ModelSource[]` | 是   | 参数选择、总结、日记和轻量文本任务使用的快速模型来源。至少一项。 |
| `llm.models.vision`           | `ModelSource[]` | 是   | 图片理解使用的视觉模型来源。至少一项。                           |
| `llm.models.<类型>[].baseUrl` | `string`        | 是   | OpenAI-compatible API 根地址，通常以 `/v1` 结尾。                |
| `llm.models.<类型>[].apiKey`  | `string`        | 是   | 该模型来源的 API Key。                                           |
| `llm.models.<类型>[].model`   | `string`        | 是   | Provider 接受的模型标识。                                        |

示例：

```ts
llm: {
  models: {
    chat: [
      {
        baseUrl: "https://api.example.com/v1",
        apiKey: "your-api-key",
        model: "chat-model",
      },
    ],
    strong: [
      {
        baseUrl: "https://api.example.com/v1",
        apiKey: "your-api-key",
        model: "strong-model",
      },
    ],
    flash: [
      {
        baseUrl: "https://api.example.com/v1",
        apiKey: "your-api-key",
        model: "flash-model",
      },
    ],
    vision: [
      {
        baseUrl: "https://api.example.com/v1",
        apiKey: "your-api-key",
        model: "vision-model",
      },
    ],
  },
},
```

## `world.phone`：手机应用配置

手机应用直接使用 world 模块内的能力实现。云旅游需要配置 Mapillary access token 才能查询街景图片。

| 字段                               | 类型     | 必填 | 含义                         |
| ---------------------------------- | -------- | ---- | ---------------------------- |
| `world.phone`                      | `object` | 否   | 手机应用配置。               |
| `world.phone.mapillaryAccessToken` | `string` | 否   | 云旅游查询街景使用的 token。 |

```ts
world: {
  phone: {
    mapillaryAccessToken: "your-mapillary-access-token",
  },
},
```

未配置 `world.phone`、未配置 `mapillaryAccessToken` 或 token 为空字符串时，不启用云旅游功能。

## `message.internalApi`：内部消息 API

message 进程会启动一个 HTTP 服务，供 world 获取群聊上下文和表情信息，并发送主动消息。

| 字段                       | 类型     | 必填 | 含义                                                                      |
| -------------------------- | -------- | ---- | ------------------------------------------------------------------------- |
| `message.internalApi.host` | `string` | 是   | 内部 HTTP 服务监听地址。三个 PM2 进程位于同一台机器时可使用 `127.0.0.1`。 |
| `message.internalApi.port` | `number` | 是   | 内部 HTTP 服务监听端口，例如 `3020`。                                     |

该接口没有面向公网的用途，不应直接暴露到公网。

## `message.proactive`：主动消息目标

| 字段                                    | 类型     | 必填 | 含义                                           |
| --------------------------------------- | -------- | ---- | ---------------------------------------------- |
| `message.proactive.onebotGroupTargetId` | `number` | 否   | 角色通过 OneBot 主动分享生活时使用的目标群号。 |
| `message.proactive.larkGroupTargetId`   | `string` | 否   | 角色通过飞书主动分享生活时使用的目标群聊 ID。  |

机器人必须已经加入目标群聊。如果还希望 message 处理该群的入站消息并维护群聊上下文，再将群聊 ID 加入对应平台的 `groupWhiteList`。

## `message.onebot`：OneBot

推荐使用 Napcat [https://github.com/NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ)，如果你不部署 @yuiju/message 聊天服务，可以不填

| 字段                             | 类型       | 必填 | 含义                                                    |
| -------------------------------- | ---------- | ---- | ------------------------------------------------------- |
| `message.onebot.protocol`        | `"ws"`     | 是   | 当前 OneBot 连接协议，固定为 WebSocket。                |
| `message.onebot.selfId`          | `string`   | 是   | 机器人自身的 OneBot 账号 ID。                           |
| `message.onebot.endpoint`        | `string`   | 是   | OneBot WebSocket 服务地址，例如 `ws://127.0.0.1:3001`。 |
| `message.onebot.token`           | `string`   | 是   | OneBot access token，应与服务端配置一致。               |
| `message.onebot.retryTimes`      | `number`   | 是   | WebSocket 连接失败后的快速重试次数。                    |
| `message.onebot.retryInterval`   | `number`   | 是   | 快速重试间隔，单位为毫秒。                              |
| `message.onebot.retryLazy`       | `number`   | 是   | 快速重试耗尽后的重试间隔，单位为毫秒。                  |
| `message.onebot.responseTimeout` | `number`   | 是   | 等待 OneBot 操作响应的最长时间，单位为毫秒。            |
| `message.onebot.whiteList`       | `number[]` | 是   | OneBot 用户白名单字段。当前消息业务处理没有读取该字段。 |
| `message.onebot.ownerList`       | `number[]` | 是   | 允许与角色进行 OneBot 私聊的 QQ 号列表。                |
| `message.onebot.groupWhiteList`  | `number[]` | 是   | 允许处理消息的 QQ 群号列表。                            |

## `message.lark`：飞书

如果你不部署 @yuiju/message 聊天服务，可以不填

| 字段                          | 类型       | 必填 | 含义                                                               |
| ----------------------------- | ---------- | ---- | ------------------------------------------------------------------ |
| `message.lark.protocol`       | `"ws"`     | 是   | 当前飞书连接协议，固定为 WebSocket。                               |
| `message.lark.endpoint`       | `string`   | 是   | 飞书开放平台 API 地址，通常为 `https://open.feishu.cn/open-apis`。 |
| `message.lark.appId`          | `string`   | 是   | 飞书应用的 App ID。                                                |
| `message.lark.appSecret`      | `string`   | 是   | 飞书应用的 App Secret。                                            |
| `message.lark.retryTimes`     | `number`   | 是   | WebSocket 连接失败后的快速重试次数。                               |
| `message.lark.retryInterval`  | `number`   | 是   | 快速重试间隔，单位为毫秒。                                         |
| `message.lark.retryLazy`      | `number`   | 是   | 快速重试耗尽后的重试间隔，单位为毫秒。                             |
| `message.lark.whiteList`      | `string[]` | 是   | 允许进行飞书私聊的用户 ID 列表。                                   |
| `message.lark.ownerList`      | `string[]` | 是   | 飞书所有者用户 ID 列表；所有者可以私聊，并可发送群聊开关命令。     |
| `message.lark.groupWhiteList` | `string[]` | 是   | 允许处理消息的飞书群聊 ID 列表。                                   |

## `message.stickers`：表情资源

`stickers` 是以稳定 key 为索引的映射表。key 会出现在 LLM 生成的 `[[sticker:key]]` 标记中，只能使用字母、数字、下划线和连字符。

| 字段                                 | 类型                      | 必填 | 含义                                                               |
| ------------------------------------ | ------------------------- | ---- | ------------------------------------------------------------------ |
| `message.stickers`                   | `Record<string, Sticker>` | 是   | 全部可用表情的映射；不需要表情时可以使用空对象。                   |
| `message.stickers.<key>.uri`         | `string`                  | 是   | 图片相对于项目根目录的路径。消息服务启动时会读取文件并缓存到内存。 |
| `message.stickers.<key>.description` | `string`                  | 是   | 提供给 LLM 的使用语境说明，帮助模型判断何时使用该表情。            |

```ts
stickers: {
  crying: {
    uri: "packages/source/picture/crying.png",
    description: "角色难过到大哭时使用。",
  },
},
```

无法读取的表情文件会在 message 启动时记录警告，并且不会进入可用表情列表。
