# Docker 一键部署

使用 Docker Compose 可以同时启动 yuiju、MongoDB 和 Redis。部署机器只需要安装 Docker，不需要安装 Node.js、pnpm 或 PM2。

## 1. 准备文件

下载项目并进入项目根目录，然后执行：

```bash
cp yuiju.config.json.example yuiju.config.json
mkdir -p data/memory
```

## 2. 填写配置

编辑 `yuiju.config.json`，补全：

- `llm.models` 中的模型、API 地址和 API Key。
- 需要使用的 OneBot 或飞书配置。
- 消息白名单和主人账号。

示例中的数据库地址和记忆目录已经适用于 Docker，不要改成 `localhost`。完整字段说明请查看[项目配置](./configuration)。

## 3. 启动

```bash
docker compose up -d
```

启动完成后访问：

```text
http://localhost:3010
```

查看运行状态和日志：

```bash
docker compose ps
docker compose logs -f app
```

默认使用 `latest` 镜像。如需固定版本：

```bash
YUIJU_VERSION=1.0.0 docker compose up -d
```

::: warning 注意
当前 Web 页面没有面向公网部署的身份认证。不要直接把 `3010` 端口暴露到公网。
:::

## 4. 停止

```bash
docker compose down
```

该命令不会删除 MongoDB、Redis 和文件型记忆中的数据。

## 5. 更新

```bash
docker compose pull
docker compose up -d
```

更新前请先阅读目标版本的变更说明，并备份重要数据。
