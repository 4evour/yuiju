# 使用 PM2 部署

完成环境准备和 `yuiju.config.ts` 配置后，在仓库根目录执行本页命令。

## 部署前检查

先确认依赖、类型和 Web 构建均可通过：

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run type-check
pnpm run build:web
```

`build:web` 会在构建时读取 `yuiju.config.ts`。如果配置值不满足 TypeScript 类型要求，构建会失败，需要根据类型错误修正配置。

## 启动全部进程

项目根目录已经封装 PM2 启动命令：

```bash
pnpm run start
```

该命令读取 `ecosystem.config.js`，启动以下进程：

- `yuiju-message`
- `yuiju-world`
- `yuiju-web`

`yuiju-web` 的启动脚本会再次执行 Next.js 构建，然后监听 `3010` 端口。PM2 显示进程在线前，需要等待这次构建完成。

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
