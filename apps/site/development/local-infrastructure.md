# 本地基础依赖

不想在本机单独安装 MongoDB 和 Redis 时，可以用 Docker Compose 只启动这两个服务。应用代码仍然通过 pnpm 在本机运行。

## 启动

确保 Docker 正在运行，然后在仓库根目录执行：

```bash
pnpm run infra:up
```

MongoDB 会监听 `localhost:27017`，Redis 会监听 `localhost:6379`。

## 查看状态

```bash
pnpm run infra:ps
```

需要排查启动问题时查看日志：

```bash
pnpm run infra:logs
```

日志命令会持续输出，按 `Ctrl+C` 退出不会停止服务。

## 连接配置

源码开发使用以下地址：

```jsonc
{
  "database": {
    "mongoUri": "mongodb://localhost:27017/yuiju?authSource=admin",
    "redisUrl": "redis://localhost:6379"
  }
}
```

完整配置步骤见[本地开发](./getting-started)。

## 停止

```bash
pnpm run infra:down
```

该命令会移除容器，但保留 MongoDB 和 Redis 的数据卷，下次启动仍可继续使用原有数据。
