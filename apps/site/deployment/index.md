# 部署概览

> 这些文档在项目的这个目录下 `apps/site/index.md`，可以直接让你的 agent 读取文档进行部署

本章介绍如何在一台长期运行的服务器上，通过 PM2 部署 yuiju。

PM2 负责管理三个应用进程：

| PM2 进程        | 启动内容                           | 默认端口或接口          |
| --------------- | ---------------------------------- | ----------------------- |
| `yuiju-message` | OneBot、飞书消息连接与内部消息 API | 内部 API 端口由配置决定 |
| `yuiju-world`   | 世界状态与角色行为循环             | 无公开端口              |
| `yuiju-web`     | Next.js Web 页面与 API             | `3010`                  |

MongoDB 和 Redis 是独立的基础设施，不由 PM2 启动或管理。部署前必须准备可访问的 MongoDB、Redis 和 LLM Provider。

## 部署流程

1. [准备运行环境](./preparation)：安装 Node.js、pnpm，准备 MongoDB 和 Redis，并拉取项目代码。
2. [完成项目配置](./configuration)：创建 `yuiju.config.json`，逐项配置数据库、模型与消息平台。
3. [使用 PM2 部署](./pm2)：检查项目并启动三个应用进程。
4. [日常运维](./operations)：查看日志、更新代码、重启服务和设置开机恢复。

## 部署边界

- 当前 PM2 配置只管理 `message`、`world` 和 `web`。
- 本章不负责安装或管理 MongoDB、Redis。
- 业务配置只从仓库根目录的 `yuiju.config.json` 读取。

## 端口与网络

默认需要关注两个监听端口：

- `3010`：Web 页面与 API。
- `message.internalApi.port`：message 进程提供给 world 的内部 HTTP API。

OneBot 和飞书连接地址由各自配置决定。若通过反向代理公开 Web 页面，只需要将外部请求转发到 `3010`；内部消息 API 不应直接暴露到公网。
