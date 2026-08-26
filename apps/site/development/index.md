# 开发指南

这里是 Yuiju 的开发文档入口。第一次参与项目时，先完成本地启动，再根据要修改的模块阅读架构和边界说明。

## 从哪里开始

1. [本地开发](./getting-started)：安装依赖、准备配置并启动服务。
2. [本地基础依赖](./local-infrastructure)：使用 Docker 启动 MongoDB 和 Redis。
3. [技术架构](./architecture)：了解 World、Message、Web、Memory 之间如何协作。

## 修改特定能力前

- 修改模型调用、Prompt 或 structured output：阅读 [LLM 协定](./llm-contract)。
- 修改数据库、消息平台或 Python 记忆服务：阅读 [外部依赖](./dependencies)。
- 只想部署自己的实例：前往 [项目部署](/deployment/)，不需要准备开发环境。

## 项目目录

| 目录 | 职责 |
| --- | --- |
| `packages/world` | 推进世界和角色行为，执行 Action |
| `packages/message` | 接入 QQ、飞书等消息平台并生成回复 |
| `packages/web` | 展示运行状态并提供 Web 接口 |
| `packages/utils` | 配置、数据库、模型、记忆和 Prompt 等公共能力 |
| `packages/satorijs-adapter-onebot` | 将 OneBot 接入统一消息协议 |
| `packages/source` | 图片、音频、数据集和辅助脚本 |
| `packages/python` | 可选的长期记忆图谱服务 |

项目使用 pnpm workspace。业务配置统一放在仓库根目录的 `yuiju.config.json`。
