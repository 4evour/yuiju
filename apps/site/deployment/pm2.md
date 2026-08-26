# 使用 PM2 部署

完成环境准备和 `yuiju.config.json` 配置后，在仓库根目录执行本页命令。

## 部署前检查

先确认依赖、类型和 Web 构建均可通过：

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run type-check
```

后续的 `pnpm run start` 会构建 Web，并在构建时读取 `yuiju.config.json`。如果配置无法通过运行时 schema 校验，启动会在进入 PM2 之前失败，需要根据配置错误修正对应字段。

## 启动全部进程

项目根目录已经封装 PM2 启动命令：

```bash
pnpm run start
```

该命令先构建 Web，再读取 `ecosystem.config.js` 启动以下进程：

- `yuiju-message`
- `yuiju-world`
- `yuiju-web`

`yuiju-web` 直接启动已经生成的 Next.js 构建产物，并监听 `3010` 端口。构建失败时 PM2 不会启动或重启进程。

## 检查进程状态

```bash
pnpm exec pm2 status
```

三个进程都应处于 `online` 状态。如果某个进程为 `errored` 或已经停止，立即查看对应日志：

```bash
pnpm exec pm2 logs yuiju-message
pnpm exec pm2 logs yuiju-world
pnpm exec pm2 logs yuiju-web
```

## 当前 PM2 行为

`ecosystem.config.js` 为三个进程设置了：

- `NODE_ENV=production`
- `watch: false`
- `autorestart: false`
- `max_memory_restart: "1024M"`

因此代码或配置变更不会自动重载，进程异常退出后也不会按 PM2 的自动重启机制重新拉起。部署者应结合自己的监控策略主动处理进程异常。
