# 部署概览

yuiju 提供 Docker 和 PM2 两种单机部署方式。普通用户优先使用 Docker；需要直接管理源码和进程时使用 PM2。

## Docker 一键部署

Docker Compose 会启动一个 yuiju 应用容器以及 MongoDB、Redis。应用镜像已经包含项目依赖和 Web 构建产物，容器内通过 `pm2-runtime` 同时运行三个应用进程。

部署机器只需要 Docker，不需要单独安装 Node.js、pnpm 或 PM2。

[开始使用 Docker 部署](./docker)

## PM2 源码部署

PM2 部署直接从源码运行三个应用进程，MongoDB 和 Redis 需要单独准备。该方式适合需要频繁更新源码、调试进程或自主管理基础设施的部署者。

1. [准备运行环境](./preparation)：安装 Node.js、pnpm，准备 MongoDB 和 Redis，并拉取项目代码。
2. [完成项目配置](./configuration)：创建 `yuiju.config.json`，逐项配置数据库、模型与消息平台。
3. [使用 PM2 部署](./pm2)：检查项目并启动三个应用进程。
4. [日常运维](./operations)：查看日志、更新代码、重启服务和设置开机恢复。

## 应用组成

两种部署方式运行相同的三个应用进程：

| PM2 进程        | 启动内容                           | 默认端口或接口          |
| --------------- | ---------------------------------- | ----------------------- |
| `yuiju-message` | OneBot、飞书消息连接与内部消息 API | 内部 API 端口由配置决定 |
| `yuiju-world`   | 世界状态与角色行为循环             | 无公开端口              |
| `yuiju-web`     | Next.js Web 页面与 API             | `3010`                  |

## 部署边界

- Docker 部署由 Compose 管理应用容器、MongoDB 和 Redis。
- PM2 部署只管理 `message`、`world` 和 `web`，不负责安装或管理 MongoDB、Redis。
- 业务配置只从仓库根目录的 `yuiju.config.json` 读取。
- 两种方式都需要至少一个 OpenAI-compatible LLM Provider。

## 端口与网络

默认需要关注两个监听端口：

- `3010`：Web 页面与 API。
- `message.internalApi.port`：message 进程提供给 world 的内部 HTTP API。

OneBot 和飞书连接地址由各自配置决定。若通过反向代理公开 Web 页面，只需要将外部请求转发到 `3010`；内部消息 API 不应直接暴露到公网。
