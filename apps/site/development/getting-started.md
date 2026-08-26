# 本地开发

完成本页后，你会在本机启动 World、Web，并可按需启动消息服务。

## 准备环境

- Node.js 24
- pnpm 10.14.x
- MongoDB
- Redis

Node.js 和 pnpm 版本分别记录在根目录 `.node-version` 和 `package.json`。如果本机没有 MongoDB 或 Redis，可以直接使用[本地基础依赖](./local-infrastructure)。

## 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

## 创建本地配置

复制配置示例：

```bash
cp yuiju.config.json.example yuiju.config.json
```

示例文件默认供完整 Docker 部署使用。源码启动时需要修改以下地址：

```jsonc
{
  "app": {
    "memoryDir": "/当前机器上的绝对路径/data/memory"
  },
  "database": {
    "mongoUri": "mongodb://localhost:27017/yuiju?authSource=admin",
    "redisUrl": "redis://localhost:6379"
  },
  "message": {
    "onebot": {
      "endpoint": "ws://localhost:3001"
    }
  }
}
```

然后填写 `llm.models`。如果需要连接 QQ 或飞书，再填写对应平台的账号、密钥和白名单。各字段用途见[项目配置](/deployment/configuration)。

`yuiju.config.json` 会包含 API Key 和平台密钥，不要提交到 Git。

## 启动项目

建议分别打开终端运行各服务。

启动世界引擎：

```bash
pnpm run dev:world
```

启动 Web：

```bash
pnpm run dev:web
```

启动后访问 `http://localhost:3010`。

配置好 OneBot 或飞书后，再启动消息服务：

```bash
pnpm run dev:message
```

需要调试长期记忆图谱时，另外启动 Python 服务：

```bash
pnpm run start:python
```

## 提交前检查

```bash
pnpm run format:write
pnpm run lint
pnpm run type-check
```

修改 World 后，还应运行：

```bash
pnpm run test:world
```

## 常见问题

### MongoDB 或 Redis 连接失败

先检查服务是否正在运行，再确认 `database.mongoUri` 和 `database.redisUrl` 使用的是 `localhost`，而不是 Docker 服务名。

### 消息服务启动失败

确认 OneBot 或飞书服务本身可访问，并检查平台连接信息和白名单。暂时不开发消息能力时，不需要启动 `dev:message`。

### Web 中部分内容加载失败

行为、日记等页面需要读取 MongoDB。先解决终端中的数据库连接错误，再刷新页面。
