# 羽浦町 (@yuiju/world)

「羽浦町」世界实现，悠酱生活的地方。

## 项目概述

这是一个基于 LLM 驱动的虚拟生活模拟系统，采用实时 tick 循环机制，模拟角色在虚拟世界中的日常生活。

### 核心特性

- **智能决策系统**：使用 LLM 根据角色状态、历史行为、当前环境进行行为选择
- **场景化行为**：基于角色所在位置（Home/School/Anywhere）提供不同的行为选项
- **状态持久化**：Redis（缓存）+ MongoDB（历史记录）双存储架构，保证状态一致性
- **参数化行为**：支持带参数的行为（如"吃"行为需要选择具体食物）
- **计划管理**：支持长期计划（长期目标）和短期计划（待办事项）
- **动态时间系统**：世界时间随行为执行自动推进

## 核心架构

### 引擎循环（[engine/](src/engine/)）

负责世界的主循环，每个 tick 执行一次完整的决策流程：获取可用行为 → LLM 决策 → 执行行为 → 等待。

### 行为系统（[action/](src/action/)）

定义角色可执行的所有行为，按场景划分（家中/学校/通用），支持前置条件过滤和参数化行为。

### 状态管理（[state/](src/state/)）

管理角色状态（体力、位置、金钱等）和世界状态（时间、天气），采用 Redis 为准的持久化架构。

### LLM 决策（[llm/](src/llm/)）

基于当前状态、历史记录和可用行为，使用 LLM 选择合适的行为和参数。

### 数据持久化

- **Redis**：角色状态的实时缓存
- **MongoDB**：行为历史记录存储

## 快速开始

### 项目配置

项目运行依赖根目录的 `yuiju.config.ts`，而不是旧版 `.env` 配置。

首次使用时，先基于示例文件创建本地配置：

```bash
cp yuiju.config.ts.example yuiju.config.ts
```

至少需要确认以下配置项：

- `database.mongoUri`：MongoDB 连接地址
- `database.redisUrl`：Redis 连接地址
- `llm.deepseekApiKey`：LLM 调用凭据

额外说明：

- `NODE_ENV` 仍然是运行时环境变量，不在 `yuiju.config.ts` 中
- `world` 依赖 Redis 与 MongoDB，启动前请确保两者可访问

### 运行命令

```bash
# 开发模式
pnpm run dev:world

# 生产模式
pnpm run start:world

# 类型检查
pnpm run type-check:world
```

## 设计原则

1. **Redis 为准**：所有状态以 Redis 中的数据为准，内存状态只是缓存
2. **行为可重现**：行为记录保存到 MongoDB，用于历史回溯和 LLM 上下文
3. **前置条件分离**：每个行为必须声明 `precondition`，系统负责过滤
4. **参数化扩展**：需要选择参数的行为通过 `parameterResolver` + Agent 实现
5. **时间一致性**：世界时间随行为执行自动推进，保证时间流逝的真实感

## 代码规范

- 使用 Biome 进行代码检查和格式化
- TypeScript 路径别名：`@/` 指向 `src/` 目录
- 所有状态修改必须通过 `CharacterState` 的方法，不要直接修改
- 行为执行器应该是幂等的，避免副作用
