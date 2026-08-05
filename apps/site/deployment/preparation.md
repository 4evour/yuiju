# 准备运行环境

## 运行机器要求

运行项目的机器需要具备以下环境：

- Git
- Node.js 24
- pnpm 10.14.x
- 可访问的 MongoDB
- 可访问的 Redis
- 至少一个 OpenAI-compatible LLM Provider

Node.js 版本以仓库根目录的 `.node-version` 为准，pnpm 版本以根目录 `package.json` 的 `packageManager` 字段为准。

PM2 已作为项目依赖安装，后续命令通过仓库脚本或 `pnpm exec pm2` 调用，不要求全局安装。

## 安装 Node.js 与 pnpm

使用 fnm 安装 Node.js 24：

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

重新打开终端，让 shell 加载 fnm 配置，然后执行：

```bash
fnm install 24
fnm use 24
```

使用 npm 安装 pnpm 10.14.0：

```bash
npm install --global pnpm@10.14.0
```

安装完成后检查版本：

```bash
node --version
pnpm --version
```

## 获取代码

选择用于长期运行项目的目录，然后克隆仓库：

```bash
git clone https://github.com/yixiaojiu/yuiju.git
cd yuiju
```

安装锁文件中声明的依赖：

```bash
pnpm i
```

## 准备基础设施

### MongoDB

MongoDB 保存行为历史、消息、MemoryEpisode、Diary 等可追溯记录。准备数据库后，记录完整连接 URI，稍后填写到 `database.mongoUri`。

### Redis

Redis 是角色和世界实时状态的真相源。准备 Redis 后，记录完整连接 URI，稍后填写到 `database.redisUrl`。

不要让 MongoDB 与 Redis 共同保存同一份实时状态，也不要把二者当作可以互相替代的存储。

## 创建项目配置

从仓库提供的示例创建真实配置文件：

```bash
cp yuiju.config.ts.example yuiju.config.ts
```

`yuiju.config.ts` 包含数据库凭据、LLM API Key 和消息平台密钥，通常不应提交到 Git。接下来按照[项目配置](./configuration)逐项填写。

## 准备本地目录

`app.memoryDir` 用于保存人物记忆、群聊记忆等文件。请提前创建目录，并确保运行 PM2 的系统用户拥有读写权限：

```bash
mkdir -p "$HOME/yuiju-data/memory"
```

文档使用家目录下的 `yuiju-data/memory` 作为示例。实际路径可以不同，但 `app.memoryDir` 中必须填写展开后的绝对路径，例如 `/Users/your-name/yuiju-data/memory`。
