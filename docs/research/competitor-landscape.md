# 竞品调研报告：LLM 驱动的虚拟角色生活模拟与 AI 桌宠

> 调研时间：2026-08-18。数据来源：GitHub API 与各项目 README / ARCHITECTURE 文档。
> Star 数与活跃度为抓取当日快照，仅供参考。
> 本报告用于支撑 [长期规划](../roadmap.md)，是当时的调研快照，不作为当前实现事实引用。

## 0. 结论（TL;DR）

yuiju 所在的「产品化常驻生活世界」格子几乎是空的：活跃的同类只有 my_ai_town（单机 Godot 游戏）和 WorldSeed（YAML 实验引擎），没有一个项目同时做到「常驻服务 + 真人长期交互 + 长期记忆 + 长程不死循环」。

AI 桌宠赛道极度拥挤，但全部缺失 yuiju 已有的核心资产：**角色的自主生活**。所有竞品桌宠本质上是「等着被搭话的宠物」。

「有长期记忆的开放性桌宠」方向可行：桌宠只是一个新的 view，不改变世界引擎内核。长期记忆是全行业公认痛点（连 13.3k star 的 Open-LLM-VTuber 都把长期记忆功能下线重做；Replika 帮助中心专门设有 Conversation & Memory 分类）。

## 1. 赛道一：虚拟世界 / 自主生活模拟（yuiju 本命赛道）

### 1.1 总览

| 项目 | Stars | 最后推送 | 状态 | 一句话定位 |
|---|---|---|---|---|
| [joonspk-research/generative_agents](https://github.com/joonspk-research/generative_agents) | 21.9k | 2024-08 | 停更 | 斯坦福原版，学术奠基 |
| [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town) | 10.3k | 2026-06 | 低维护 | Convex 常驻小镇，工程化转折点 |
| [camel-ai/oasis](https://github.com/camel-ai/oasis) | 5.0k | 2026-08 | 活跃 | 百万级社媒模拟（正交方向） |
| [AIScientists-Dev/WorldSeed](https://github.com/AIScientists-Dev/WorldSeed) | 809 | 2026-05 | 较活跃 | YAML 配置驱动的多世界引擎 |
| [google-deepmind/concordia](https://github.com/google-deepmind/concordia) | 1.6k | 2026-08 | 活跃 | DeepMind Game Master 模式研究库 |
| [tsinghua-fib-lab/AgentSociety](https://github.com/tsinghua-fib-lab/AgentSociety) | 1.2k | 2026-08 | 活跃 | 清华城市级社会模拟，已出 v2 |
| [mewamew/my_ai_town](https://github.com/mewamew/my_ai_town) | 598 | 2026-08 | 每日更新 | **与 yuiju 最像的竞品**，Godot 单机生活模拟 |
| altera-al/project-sid | 1.35k | 2024-11 | 论文无代码 | Minecraft 文明模拟，PIANO 架构 |
| nmatter1/smallville | 813 | 2023-10 | 停更 | 给已有游戏做 generative NPC 后端 |
| [Agentshire/Agentshire](https://github.com/Agentshire/Agentshire) | 1.3k | 2026-04 | 活跃 | OpenClaw 生态：coding agent 入住 3D 小镇 |

### 1.2 关键项目机制对比

**generative_agents（斯坦福，2023 奠基）**
- 记忆流：每条事件带时间戳、重要度打分（1-10）、embedding；检索分数 = recency（指数衰减）× importance × relevance。
- Reflection：累计重要度超阈值触发 LLM 合成高层「反思」写入记忆流。
- 分层规划：全天日程 → 递归分解为 5-10 分钟粒度动作。
- 致命局限：文件系统存 JSON、离线跑完再回放（无法运行中介入）、25 agent 跑 2 天花数千美元、2024-08 后停更。

**ai-town（a16z，2023 工程化）**
- Convex 数据库即引擎：所有变更走事务性 input 队列（join/moveTo/startConversation），人类玩家和 agent 走同一条通道。
- 常驻在线世界：Convex cron 驱动，状态持久云端，重启可恢复。
- 记忆：observations / chats / 周期性 reflections 存表 + 内建向量检索。
- 局限：深度绑定 Convex（换基础设施=重写）、对话只支持 2 人、行为长期目标浅（聚会→聊天→散步循环）、上游冻结（实际维护在 get-convex/ai-town，271★）。

**my_ai_town（与 yuiju 最接近）**
- 纯 Godot 单机生活模拟：居民由 LLM 驱动，综合性格、职业、关系、记忆、地点、正在发生的事决策；世界系统对移动、工作、交谈、物品操作做校验并返回真实结果（与 yuiju 的 precondition 行为系统同思路）。
- **世界日志（客观经过）与居民个人记忆（主观理解）分离**。
- 玩家可化身进入（WASD 移动、E 互动）、与居民交谈、发布公告、改变天气，干预会进入居民记忆并持续起作用。
- 局限：单机架构（无服务端、无多用户）、无开源协议、单人项目、LLM 成本玩家自付。

**WorldSeed**
- `rules + different agents + consequences -> emergence`：YAML 定义角色/规则/私有信息/动作/后果，同一引擎跑不同世界。
- 用户介入三档：俯瞰观察 / 干预 / 直接扮演其中一个角色。

**concordia（DeepMind）**
- Game Master 模式：GM 把 agent 的自然语言动作仲裁成世界结果，类似跑团主持人；三层结构 Entities / Components / Engine。
- 局限：纯文本回合制、episode 式（有 stop condition）、无常驻持久世界。

**AgentSociety v2（清华）**
- LLM-native 模拟平台：agent 无状态记录跑在 Ray Task 上，JSONL trace + 回放 + DuckDB 分析，MCP 工具接入。
- 面向社科研究，基础设施重（Ray/gRPC），无真人玩家。

**project-sid（Altera，只有论文）**
- Minecraft 里 10-1000+ agent 出现分工、经济、集体规则修改。
- PIANO 架构：多个并行认知模块（对话/规划/情绪/目标）以 10Hz 认知时钟协同。**「目标内驱力 + 文明里程碑」是最接近真正自主生活的方向，且无开源实现。**

### 1.3 技术演进脉络

1. **2023 上半年 generative_agents**：奠基（记忆流+反思+两级规划+瓦片世界），但是离线回放的研究品。
2. **2023 下半年 ai-town**：工程化（常驻世界、数据库即引擎、人类与 agent 同通道、Ollama 降成本），MIT 协议引发 fork 潮。
3. **2024 concordia + 规模化**：GM 抽象、OASIS 百万 agent、AgentSociety 城市级、Project Sid 实时认知架构。
4. **2025-2026 三分支**：研究平台化（可复现可审计）；游戏化单机化（my_ai_town、WorldSeed）；外部 agent 入住（MCP/OpenClaw 生态把小镇变成 coding agent 的居所）。

### 1.4 行业共识与空白

当前最佳实践共识（yuiju 对照）：

| 共识 | yuiju 现状 |
|---|---|
| 引擎与 LLM 分离：确定性引擎做校验/时间推进，LLM 只出决策和语言 | ✅ precondition 行为系统 |
| 分层决策：日计划→日程槽→每 tick 行为，纯每 tick 调 LLM 又贵又抖 | ✅ 已有计划体系 |
| 三层记忆 + 客观世界日志与主观记忆分离 | ✅ Redis 实时 + MongoDB 历史；person-memory 已按人组织 |
| 持久化分层：热状态 + 事件溯源 + 可回放 | ✅ Redis + MongoDB 行为历史 |
| 用户介入要「进入记忆」才能产生持续影响 | ✅ 对话写入 person-memory |

全行业没解决好的问题（= 机会）：

1. **长程漂移与死循环**：跑数天后 agent 陷入重复日程、目标达成后无事可做；缺内驱力/目标生成模型（只有 Project Sid 认真做过且未开源）。
2. **记忆污染与一致性**：反思会固化幻觉信念，错误记忆无纠错机制。
3. **时间与成本错配**：模拟时间、真实时间、LLM 延迟三者打架。
4. **多用户并发介入**：几乎没有项目有真正的「多真人共存于 agent 世界」玩法层。
5. **评估缺失**：「活得可信」没有公认标准。
6. **工程断层**：研究代码与产品之间缺中间件，绝大多数项目 6-12 个月停更（smallville、AgentSims、competeai、project-sid 全是例证）。

## 2. 赛道二：AI 桌宠 / 桌面虚拟伴侣

### 2.1 总览

| 项目 | Stars | 形象 | 记忆 | 主动性 | 栈 |
|---|---|---|---|---|---|
| [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber) | 13.3k | Live2D + 桌宠模式 | **长期记忆已下线重做中** | 主动开口 + 语音打断 | Python + Web |
| cc-haha / clawd-on-desk / oc-claw / agentpet 等 | 14k / 6k / 351 / 324 | 像素 | 无 | 无（监视 coding agent 的观赏宠） | TS / Rust |
| [LingChat](https://github.com/SlimeBoyOwO/LingChat) | 1.5k | Galgame 立绘 + 桌宠 | 存档独立永久记忆 | 屏幕感知 + 主动搭话（看桌面触发视觉模型） | Tauri + TS |
| [AI-YinMei](https://github.com/worm128/AI-YinMei) | 960 | Live2D VTuber/桌宠 | — | — | Python |
| [ZcChat](https://github.com/Zao-chen/ZcChat) | 559 | Galgame 演出 | — | — | C++ |
| pub-local-jarvis | 414 | 屏幕音频感知桌宠 | 本地 | — | Windows |
| Artemis | 271 | Live2D 离线女友系统 | 本地 | QQ/Telegram 通道 | 8GB VRAM 全家桶 |
| [PetGPT](https://github.com/JulesLiu390/PetGPT) | 105 | 多窗口表情桌宠 | 用户事实抽取、按助手记忆库 | **群聊 5 档说话意愿分级** | Tauri 2 + React |
| [KokoroMemo](https://github.com/CyrilPeng/KokoroMemo) | 69 | （记忆代理，无形象） | 记忆卡片 + 审核收件箱 + 会话状态板 | — | Python + Tauri |
| utsuwa | 73 | VRM AI 女友（Grok Companion 开源替代） | — | 约会模拟机制 | — |

### 2.2 赛道格局

- **技术栈高度同质化**：Live2D/精灵图 + Tauri/Electron + LLM API + 情绪表情映射，大家都在卷「聊天体验」。
- **2026 新物种**：监视 coding agent 的观赏桌宠（cc-haha 14k★ 一年内冲到赛道第一），证明「桌面常驻 + 有可看的内容」需求真实存在，但它没有任何陪伴属性。
- **普遍缺失三样东西**：
  1. **角色的自主生活**：所有桌宠都是「等着被搭话的宠物」，没有行为历史、没有世界。
  2. **真正的长期记忆**：Open-LLM-VTuber 长期记忆下线；LingChat 的「永久记忆」是存档级，不是检索式记忆系统。
  3. **有内容支撑的主动性**：主动搭话靠屏幕感知触发，内容是「你在忙吗」级别，没有生活素材可分享。

### 2.3 重点参考项目

- **PetGPT**：方向上最接近「桌宠 + QQ + 地图 + 记忆」的组合，但没有世界引擎——角色没有真实生活，群聊回复靠 Observer/Reply/Intent 四层流水线 + 5 档说话意愿。其「意愿分级」机制对 yuiju 群聊场景有直接参考价值。
- **KokoroMemo**：证明「桌宠记忆」值得单独成项目。核心机制：新提炼记忆进收件箱需审核后转正（防污染）、会话状态板承载热状态与长期记忆隔离、按 user/character/conversation 三级隔离防串记。目标「不忘、不串、不乱记」。
- **LingChat**：Galgame 演出 + 情绪驱动表情（18 类情绪分类模型）+ 桌宠模式的工程参考。

## 3. 赛道三：AI Agent 长期记忆框架

### 3.1 总览

| 项目 | Stars | 范式 | 关键机制 |
|---|---|---|---|
| [mem0](https://github.com/mem0ai/mem0) | 63.5k | 事实抽取 | 新版 ADD-only + 时间推理（永不覆盖，按时间线取当前有效值） |
| [cognee](https://github.com/topoteretes/cognee) | 30.1k | 知识图谱 | remember/cognify/recall/forget，本地 Kuzu+LanceDB |
| [Graphiti (Zep)](https://github.com/getzep/graphiti) | 30.0k | 时序知识图谱 | **bi-temporal 双时间轴**；事实失效而非删除；语义+BM25+图遍历三路检索 |
| [Letta (MemGPT)](https://github.com/letta-ai/letta) | 24.3k | 分层上下文 | core memory blocks（persona/human 块）；**sleep-time compute**（空闲期后台精炼记忆） |
| MemOS | 10.8k | 认知架构 | MemCube 分层：traces/policies/world model |
| memU | 14.3k | — | 已转型编码 agent 记忆 wiki，不再面向陪伴 |
| Honcho | 6.7k | 关系记忆 | **(observer, observed) 双视角**：按「一方对另一方的认知」建模 |
| HippoRAG | 3.9k | 研究向 | 海马体 KG + Personalized PageRank |
| A-Mem | 1.1k | 研究向 | Zettelkasten 记忆互链与演化 |
| MemoryBank | 0.4k | 停更 | **唯一显式实现 Ebbinghaus 遗忘曲线** |

注：Letta 主仓库已变 landing page，V1 Python 服务端进入 archive 分支（官方明言不支持生产使用），活跃开发迁往 letta-code（TS）与 Letta Cloud。

### 3.2 四种范式对比

| 维度 | 分层上下文派 (Letta) | 事实抽取派 (mem0) | 时序知识图谱派 (Graphiti) | 认知架构派 (MemOS 等) |
|---|---|---|---|---|
| 写入 | agent 自编辑 / 自动 flush | LLM 单次抽取，ADD-only | LLM 抽实体/边建图 | 分层固化 |
| 检索 | 常驻块免检索 + 向量 | 语义+BM25+实体融合 | 语义+BM25+图遍历，查询期零 LLM | 混合+自动路由 |
| 遗忘 | limit 截断 | 不删除，时间排序压旧 | 失效不删除 | forget API |
| LLM 成本 | 低 | 中 | 高（多次结构化抽取） | 高 |
| 外部依赖 | Postgres | 一个向量库 | 图数据库+向量 | 图+向量+缓存 |

2025→2026 共同趋势：(1) 放弃就地 UPDATE/DELETE，转向 append-only + 时间感知检索；(2) 检索收敛到混合三路，查询期尽量不用 LLM；(3) 写入从热路径迁往后台异步。

### 3.3 结论：不引入框架，借鉴机制

上述框架几乎全部面向任务型/助手型 agent（心智模型是「关于用户的事实」），而 yuiju 拥有它们没有的资产——**行为历史、游戏内时间、日记、计划**，这些本身就是记忆系统的原料。整套引入的代价：图数据库运维、每条消息多次 LLM 抽取成本、失去数据主权。全部关键机制都可以在 MongoDB 上原生实现（MongoDB Atlas 原生支持向量搜索 + BM25）。

最值得借鉴的六个机制：

1. **双时间轴（Graphiti）**：每条记忆同时记录「角色世界内发生时间（模拟时钟）」与「系统摄入时间（现实时钟）」。yuiju 的模拟时间比 graphiti 面向聊天日志更契合——角色应该「按自己活过的时间」回忆（上周三我们一起……），检索排序用模拟时间做 recency。
2. **日记 = reflection 落点（Letta sleep-time 变体）**：把记忆精炼、事实抽取全部调度到角色的睡觉/独处时段，「睡前整理一天的记忆」叙事完全自洽，是免费的 sleep-time compute。
3. **ADD-only，不覆盖（mem0 新版）**：陪伴场景里「角色记得过时的事实」是真实感来源而非 bug。保留全部版本按模拟时间检索，记忆冲突成为对话素材而非需要消除的错误。
4. **分层 blocks（Letta）**：常驻上下文的「角色自我认知 + 对每个用户的认知 + 关系当前状态」，限额管理，空闲期精炼。
5. **(observer, observed) 双视角（Honcho）**：角色对用户的记忆是角色自己的（可能不准确的）表征，不是客观事实库。每个角色带着自己的记忆生活才是自主生活。
6. **审核收件箱 + 三级隔离（KokoroMemo）**：新记忆先入收件箱再转正防污染；按用户/角色/会话隔离防串记。yuiju 的 person-memory 已有隔离基础。

generative agents 三件套的工业化落点对照：memory stream → MongoDB append-only 事件表（已有）；recency 衰减 → 检索时按模拟时间指数衰减（可加）；importance 打分 → 写入时 LLM 打分（可加）；reflection → 日记（已有载体，缺固化到记忆的链路）。

## 4. 赛道四：AI 陪伴产品生态

### 4.1 开源

- **[SillyTavern](https://github.com/SillyTavern/SillyTavern)（32.3k★）**：角色卡 + 世界书（WorldInfo/lorebook）+ power user 生态霸主。本质是 LLM 前端，角色无生活、无主动性。与 yuiju 不构成直接竞争，反而是可兼容生态（世界书格式、角色卡导入）。
- **meuxe / utsuwa**：自托管 Live2D/VRM 聊天伴侣，约会模拟机制，社区早期。

### 4.2 商业产品

公开检索受限（搜索引擎返回无关结果），仅获得两个可信信号：

- **Replika** 帮助中心专门设有「Conversation & Memory」分类——记忆是高频用户话题。
- 有竞品（ourdream.ai）公开以「测试 10 个 Replika 替代品的记忆保持能力、只有一个保持住角色」作为对比营销——记忆保持是行业公认的痛点与竞争维度。

结合赛道二的证据（Open-LLM-VTuber 长期记忆下线重做、KokoroMemo 单独成项目），可确认：**失忆与人设漂移是全行业未解决痛点**，这正是 yuiju 以行为历史为根基的差异化机会。

## 5. 综合定位分析

### 5.1 yuiju 的坐标

「常驻服务 + 单角色深度生活 + 真人长期共存」格子只有 yuiju。最近邻：

- my_ai_town：有世界但单机、玩家自付 LLM、无服务端。
- PetGPT：有桌宠+QQ+记忆但无世界引擎。
- Open-LLM-VTuber：有桌宠+语音但记忆下线、无生活。
- ai-town：有常驻世界但无深度生活、绑定 Convex、多数部署只用于观察。

**护城河不是某个功能，而是「世界的真实性」**：她的近况来自真实发生的行为历史，这不是能用 prompt 现编出来的。

### 5.2 「有长期记忆的开放性桌宠」评估

可行，且是自然延伸：

- 桌宠不改变内核，只是新增一个 view。yuiju 已有 web 可视化，桌宠 = 轻量常驻桌面壳（Tauri，赛道主流选择）+ 透明置顶穿透 + 状态同步。
- 桌宠窗口展示的不是「等待指令的宠物」，而是**她此刻的生活现场**——她在写作业时桌宠就在写作业，她去打工时桌宠离开屏幕。这与市面上所有桌宠形成本质差异，也是把「观察角色生活」从 QQ 聊天扩展到桌面的自然一步。
- 前置依赖是长期记忆：没有长期记忆的桌宠只是又一个聊天挂件。

### 5.3 风险

- 长程活力问题（死循环/日程漂移）在全行业无解，yuiju 已投入治理（idle 分档恢复），但根治需要内驱力模型，工程量大。
- 单人维护的同类项目 6-12 个月停更是常态，需要控制每阶段范围。
- LLM 成本随记忆检索和行为密度上升，需要预算意识。
