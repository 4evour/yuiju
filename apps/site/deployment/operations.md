# 日常运维

本页命令均在仓库根目录执行。

## PM2 日常使用

查看全部 PM2 进程：

```bash
pnpm exec pm2 status
```

持续查看全部标准输出：

```bash
pnpm exec pm2 logs
```

只查看单个进程：

```bash
pnpm exec pm2 logs yuiju-world
```

启动、重启或停止全部项目进程：

```bash
pnpm run start
pnpm run restart
pnpm run stop
```

只重启单个进程：

```bash
pnpm exec pm2 restart yuiju-world
```

当前配置使用 `autorestart: false`，停止或异常退出的进程不会自动恢复，需要显式执行启动或重启命令。

## 更新项目

::: danger 警告
项目更新可能包含破坏性变更。更新前必须阅读目标版本的变更说明，确认配置格式、数据库结构和部署步骤是否发生变化，并提前备份重要数据与配置。
:::

确认本地没有尚未保存的改动后执行：

```bash
git pull
pnpm install
pnpm run restart
```

`pnpm run restart` 会先构建 Web，再重启全部 PM2 进程。如果构建失败，现有进程不会进入重启步骤，应根据终端中的构建错误修正问题。
