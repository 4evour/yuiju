# Agent 记忆机制调研与 yuiju 类人记忆设计

> 调研时间：2026-08-20。数据来源：arXiv 论文全文、GitHub API、官方文档（star 数与活跃度为抓取当日快照）。
> 本文是 [长期规划](../roadmap.md) L1（长期记忆）的机制细化依据，与 [竞品调研报告](./competitor-landscape.md)（2026-08-18）互补：前一份看赛道格局，这一份看记忆机制的具体实现与科学基础。
> 调研结论是时点快照，落地前应对照最新代码与论文复核。

## 0. 结论摘要

- **现有路线被最新证据强烈支持**：2026-08 的 ReFind 论文证明「原文全存 + 胜任检索」超过大部分结构化记忆方案。yuiju 的 append-only 事件流是正确的真相源，不应推翻。
- **"不可能全存"是伪问题**：十万条事件在 SQLite 里只有几十 MB，瓶颈从来不是存储成本，而是**检索时的上下文 token 预算**。解法：全存原文、巩固出可检索的语义层、遗忘只发生在检索分数上、永不物理删除。
- **"正确引用知识点"的解法**：provenance（来源链）+ 双时态时间戳 + 置信度措辞分级 + 弃答（abstention）。
- **存储终态**：本地常驻 Node 进程做记忆核心（web 与 QQ 都是它的客户端），SQLite 单文件替代 Mongo/Qdrant/Redis 三个容器，部署简化为「一个进程 + 一个数据目录」。
- **反面证据**：覆盖式压缩丢历史（ChatGPT 记忆在 LongMemEval 掉到 full-context 的 -37%）、Mem0 式硬 DELETE、MemGPT 式纯 FIFO 逐出——都不可取。

---

# 第一部分：最新 Agent 记忆机制全景（2025-2026）

## 1.1 总览表（按 star 排序，2026-08-20 抓取）

| 项目 | Star | 创建 | 最近 push | 一句话定位 |
|---|---|---|---|---|
| [mem0ai/mem0](https://github.com/mem0ai/mem0) | 63.6k | 2023-06 | 2026-08-18 | 事实级抽取 + ADD/UPDATE/DELETE 操作语义 |
| [MemPalace/mempalace](https://github.com/MemPalace/mempalace) | 58.5k | 2026-04 | 2026-08-20 | 逐字存储+零 LLM 索引，4 个月暴涨的黑马 |
| [volcengine/OpenViking](https://github.com/volcengine/OpenViking) | 30.4k | 2026-01 | 2026-08-20 | 火山引擎"上下文数据库"，L0/L1/L2 分层加载 |
| [getzep/graphiti](https://github.com/getzep/graphiti) | 30.1k | 2024-08 | 2026-08-18 | 时间知识图谱、双时态、事实失效 |
| [topoteretes/cognee](https://github.com/topoteretes/cognee) | 30.1k | 2023-08 | 2026-08-19 | 自托管知识图谱记忆平台 |
| [supermemoryai/supermemory](https://github.com/supermemoryai/supermemory) | 29.0k | 2024-02 | 2026-08-20 | 商业记忆引擎，自动过期+矛盾解决 |
| [letta-ai/letta](https://github.com/letta-ai/letta) | 24.3k | 2023-10 | 2026-08-16 | MemGPT 延续 + sleep-time compute |
| [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) | 23.3k | 2026-04 | 2026-08-15 | L0-L3 语义金字塔 + 符号化短期记忆 |
| [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight) | 20.2k | 2025-10 | 2026-08-20 | "会学习的记忆"：信念+证据计数 |
| [memvid/memvid](https://github.com/memvid/memvid) | 16.4k | 2025-05 | 2026-07-14 | 视频文件当记忆库（离线冷存） |
| [MemoriLabs/Memori](https://github.com/MemoriLabs/Memori) | 16.1k | 2025-07 | 2026-08-19 | agent 原生记忆基础设施 |
| [NevaMind-AI/memU](https://github.com/NevaMind-AI/memU) | 14.3k | 2025-07 | 2026-08-19 | 500 行 agentic 技能记忆（偏向 coding agent） |
| [EverMind-AI/EverOS](https://github.com/EverMind-AI/EverOS) | 12.2k | 2025-10 | 2026-08-17 | local-first、Markdown 原生记忆层 |
| [MemTensor/MemOS](https://github.com/MemTensor/MemOS) | 10.8k | 2025-07 | 2026-08-19 | MemCube + MemScheduler 三态记忆 |
| [Mirix-AI/MIRIX](https://github.com/Mirix-AI/MIRIX) | 3.4k | 2025-04 | 2026-08-18 | 六类记忆 + 屏幕观察 |
| [BAI-LAB/MemoryOS](https://github.com/BAI-LAB/MemoryOS) | 1.6k | 2025-05 | 2026-07-07 | STM/MTM/LPM 分层 + 热度 |
| [agiresearch/A-mem](https://github.com/agiresearch/A-mem) | 1.2k | 2025-02 | 2025-12 | Zettelkasten 记忆互链（NeurIPS 2025 正式版在 WujiangXu/A-mem，944★） |
| [qhjqhj00/MemoRAG](https://github.com/qhjqhj00/MemoRAG) | — | — | — | 全局记忆+线索引导检索 |

## 1.2 MIRIX（arXiv:2507.07957）

**先纠正两个广泛流传的误解**（来自论文全文 + 当前 README 核实）：

- 六类记忆**不是** Sensory/Short-term/Core/Episodic/Semantic/Procedural。论文和当前 README 都是：**Core / Episodic / Semantic / Procedural / Resource / Knowledge Vault**，各由一个专职 agent 管理（`core_memory_agent` 等）。"Sensory/Short-term" 只出现在相关工作的讨论里。
- 论文里**没有** sleep-time consolidation。它有的是**显式调用的 auto-dream**：一个端点，"reviews existing memories, merges duplicates, resolves stale/conflicting entries"，支持 `dry_run` 预览。

**各记忆组件的数据结构**：

- **Core**：常驻 prompt 的高优先级信息，两个块（persona / human）。"memory size exceeds 90% of capacity" 时触发改写压缩。
- **Episodic**：带时间戳事件（"structured log or calendar"）。字段：`event_type`(user_message/inferred_result/system_notification)、summary、details、actor、timestamp。
- **Semantic**：时间无关事实（如"哈利波特作者是 J.K. Rowling"）+ 社交图谱。字段：name、summary、details、source(user_provided/Wikipedia/inferred)。除非被"概念性覆盖"否则永久保留。
- **Procedural**：how-to/工作流/脚本。字段：entry_type(workflow/guide/script)、goal、steps（可 JSON 指令列表）。
- **Resource**：正在处理的文档/转录/多模态文件（doc、pdf_text、image、voice_transcript）。
- **Knowledge Vault**：逐字敏感数据（凭据、地址、API key），带 sensitivity 等级，高敏条目"excluded from casual retrieval"。

**路由与检索（Active Retrieval）**：两阶段——(1) agent 先根据上下文生成"当前主题"；(2) 用该主题从六类记忆各取 top-10，以 `<episodic_memory>...</episodic_memory>` 等源标签注入 system prompt。检索函数有 embedding_match / bm25_match / string_match 三种。**写入路由**：Meta Memory Manager 判断输入与哪些组件相关 → 分发给六个 Memory Manager 并行更新（带组件内去冗余）→ 汇报确认。

**多模态管线**：每 1.5s 截屏 → 相似度 >0.99 判重丢弃 → 每约 20 张唯一截图（~60s）触发一次记忆更新 → Gemini 流式上传，把延迟从 ~50s 压到 <5s。

**效果**：LoCoMo（gpt-4.1-mini judge）总体 **85.38**，高于 Zep 79.09、LangMem 78.05、Mem0 62.47，接近 full-context 上界 87.52；multi-hop 83.70 领先 24+ 分。ScreenshotVQA：0.595 准确率 vs SigLIP RAG 0.441，存储 15.89MB vs 15.07GB（+35% 精度、99.9% 存储缩减）。

**局限**：无消融实验（附录只有 3 次运行的方差 83.98/87.34/84.82）；open-domain 弱于 RAG 上界（65.62）；多 agent 架构 LLM 调用多；LoCoMo 的 LLM-judge 分数与 Mem0 论文的 F1 分数不可直接互比；未用 LongMemEval 评测。

**对 yuiju 的参考价值**：记忆类型学 + 字段 schema（尤其 Procedural 对虚拟角色的生活习惯、Episodic 对事件流）、"主题先行的两阶段检索"。

## 1.3 MemoryOS（arXiv:2506.06326，EMNLP 2025）

**纠正**：论文全文里**不存在 "PSJ" 这个术语**。网络上传的 "FIFO/PSJ" 应是误传；实际机制是 **FIFO 队列 + 段页式(segmentation-paging)管理 + 对话链(chain)**。

**三层结构与数据结构**：

- **STM**：定长队列（长度 7），每页 `page_i = {Q_i, R_i, T_i}`。每页附带对话链元数据 `page_i^chain = {Q_i, R_i, T_i, meta_i^chain}`：LLM 两步生成——先判断新页与之前页面是否语义连续（连续则挂链，不连续则重开新链），再把链上所有页摘要成 `meta^chain`。满了以后最老页 **FIFO** 转入 MTM。
- **MTM**：段页式。同主题页归入段：`segment_i = {page_i | F_score(page_i, segment_i) > θ}`，θ=0.6，其中 `F_score = cos(e_s, e_p) + Jaccard(K_s, K_p)`（K 为 LLM 摘出的关键词集）。段内容由 LLM 从成员页生成摘要。段数上限 200，超出时**淘汰热度最低的段**。
- **LPM（长期人设记忆）**：用户侧 = 静态画像（性别/姓名/出生年）+ 动态用户知识库 + **90 维用户特质**（三类：基本需求与人格、AI 对齐偏好、内容兴趣标签）；agent 侧 = 固定角色画像 + 动态 agent 特质。用户 KB 和 agent 特质是**定长 100 条的 FIFO**。

**热度公式（论文 Eq.4）**：

```
Heat = α·N_visit + β·L_interaction + γ·R_recency
R_recency = exp(−Δt / μ)     # Δt = 距上次访问的秒数，μ = 1e7（可配），α=β=γ=1
```

- `N_visit`：段每次被检索命中 +1（**这就是"检索即强化"**）
- `L_interaction`：段内对话页总数
- `R_recency`：检索时刷新，随时间指数衰减

**升级算法**：STM FIFO 淘汰 → MTM 按 F_score>0.6 并段 → 段 Heat 超过阈值 τ=5 时晋升 LPM（其页用来更新 90 维特质、用户 KB、agent 特质）→ 晋升后 `L_interaction` 清零（防止重复晋升）。检索：top-5 段 + 段内 top-5/10 页 + KB/特质 top-10。

**效果**：LoCoMo 平均 **+49.11% F1 / +46.18% BLEU-1**（vs 最强基线 A-Mem/MemGPT），temporal 类 +118.8% F1；效率上 3,874 tokens + 4.9 次 LLM 调用（MemGPT 要 16,977 tokens）。消融显示 MTM 贡献最大，LPM 次之，对话链最小。

**局限**：全部数字基于 F1/BLEU-1（与 Mem0 论文的 LLM-judge 不同口径，MemoryOS 在 Mem0 口径下其实不高）；μ=1e7 秒≈115 天意味着 R_recency 短期内几乎不衰减，遗忘实际靠 FIFO 淘汰而非热度衰减；无任何"时间推理"专门机制却在 temporal 上大涨（因为逐字对话+时间戳被保留）。

**对 yuiju 的参考价值**：整套借用"热度 = 访问次数 + 交互量 + 时间衰减"来决定哪些日/周摘要晋升为长期事实、哪些降级到冷库。

## 1.4 Letta sleep-time compute（arXiv:2504.13171）

**机制**：把 prompt 拆为上下文 c（会话前就有的东西）和查询 q。空闲期由 **sleep-time agent**（persona 为 Letta-Offline-Memory）执行 `S(c) → c′`：对 c"draw inferences and re-write c in a way that might be useful at test-time"。实现为函数调用：`rethink_memory`（用融入新推断的精炼字符串替换上下文，最多调用 10 次）和 `finish_rethinking`。产出写入 rethink_memory_block，wake-time agent 被明确指示"不要重算已预计算的结果"。

**数学框架**：test-time `T_B(q,c) → a`（预算 B）；sleep-time `S(c) → c′`；wake-time `T_b(q,c′) → a`，b≪B。c′ 被 N 个查询摊销，成本模型里"test-time token 价格是 sleep-time 的 t=10 倍"。扩展方式：并行生成 k 个 c′ 拼接，或提高推理模型思考预算。

**效果数据**：

- 达到同等精度可省 **~5× test-time compute**（Stateful GSM-Symbolic 与 Stateful AIME 均成立）
- sleep-time 扩展把精度提升 up to 13%（GSM）/ 18%（AIME）
- 每上下文 10 个查询时，单查询平均成本降 2.5×
- 等价 test-time token 预算下普遍 Pareto 支配 pass@k；5 个并行生成优于 10 个
- 问题越"可预测"，sleep-time 优势越大

**局限（论文自述）**：查询难预测时收益小；两阶段假设过简（真实场景多轮、上下文会变）；高预算区纯 test-time 反超（c′ 里有干扰信息）。

**对 yuiju 的参考价值**："睡眠固化"可以从"摘要压缩"升级为"预推理"：夜间不只生成日记摘要，还生成 c′——关于用户/世界的推断集、预答的常见问题。

## 1.5 巩固与遗忘算法

### MemoryBank（arXiv:2305.10250）——Ebbinghaus 公式细节

**纠正**：论文比传说中简单得多：

```
R = e^(−t/S)      # R 保留率，t 距上次回忆时间，S 记忆强度
初始 S = 1；每次被回忆时：S ← S + 1，t ← 0
```

- **没有**数值化遗忘阈值、**没有** SM-2 式复习日程表（"spacing effect"只是定性引用——[0.5,1,2,4,7,15,30] 这类间隔表是以讹传讹）。作者自称这是"an exploratory and highly simplified memory updating model"。
- 架构：带时间戳对话 + 分层摘要（日事件摘要 → 全局摘要；用户人格同理日→全局画像）；检索用 DPR 双塔 + FAISS。
- "S+=1 且重置 t"就是**检索式学习/测试效应**在 agent 记忆中的最早直接实现。

### Generative Agents（arXiv:2304.03442）——0.995 的真正出处（不是 MemGPT）

```
score = α_recency·recency + α_importance·importance + α_relevance·relevance
        （三者 α 均为 1，先各自 min-max 归一）
recency = 指数衰减，衰减因子 0.995（幂底数），指数 = 距「上次被检索」的沙盒小时数
importance：写入时 LLM 打 1-10 分（"1 is purely mundane ... 10 is extremely poignant"）
relevance：记忆嵌入与查询记忆嵌入的余弦
```

- 反思触发：近期事件 importance 总和 **>150** → 先对最近 100 条让 LLM 提"3 most salient high-level questions"→ 作为检索查询 → "What 5 high-level insights can you infer"→ 洞察作为 reflection 存储，**指针指向证据记录，形成反思树**。角色每天自发反思 2-3 次。

### MemGPT（arXiv:2310.08560）

- main context 三段：system / working context（即 core memory，只能靠函数调用写）/ **FIFO 消息队列**。
- 逐出是**纯阈值触发 FIFO**：token 到 ~70% 发"memory pressure"警告让 LLM 自救保存，到 ~100% 逐出一批（如窗口 50%）并生成递归摘要存入 recall storage。
- **全文没有 0.995 或任何衰减公式**（网上常归错）。
- 外部记忆：recall storage（全量消息库）+ archival storage（pgvector + HNSW 余弦检索，分页防溢出）。

### Mem0（arXiv:2504.19413）

- 两阶段：(1) 抽取：`(m_{t−1}, m_t)` + 异步刷新的会话摘要 S + 最近 m=10 条窗口 → LLM 产出候选事实；(2) 更新：每条事实向量检索 top-10 相似旧记忆，交给 LLM 以**工具调用**选择 `ADD`（无等价记忆时，GenerateUniqueID）/ `UPDATE`（仅当新事实信息量超过旧记忆才替换，保留 id）/ `DELETE`（被矛盾时**硬删**）/ `NOOP`。
- Mem0g 图版本：节点带类型/嵌入/创建时间戳，边为三元组；矛盾时 LLM resolver 将关系**标记失效而非物理删除**（软删除、支持时间推理）。
- **Mem0 本体没有任何访问计数或衰减**。
- LoCoMo（LLM-judge）：Mem0 66.88 / Mem0g 68.44 vs full-context 72.90、Zep 65.99；p95 延迟 1.44s（全上下文 17.1s）；每会话记忆占用 ~7k tokens（Zep >600k）。

### MemOS（arXiv:2507.03724）

- 三态记忆 = plaintext（可检索文本）/ activation（KV-cache 为中心）/ parameter（权重，可挂 LoRA）。
- **MemCube** 统一封装：Payload + Metadata——描述性（时间戳/来源签名/语义类型）；治理性（**TTL 或 decay 规则、优先级、访问控制**）；行为性（访问频度 hot/cold、上下文指纹、版本链）。
- MemScheduler 按 "contextual similarity, access frequency, temporal decay, and priority tags" 调度，热记忆进 GPU/KV，长期不用**降级为 plaintext 归档冷存**。
- LoCoMo（同 GPT-4o-mini）：**73.31 vs Mem0 64.57**（temporal 73.21 vs 52.34 差距最大）；KV 注入比 prompt 注入 TTFT 提速 18.6%–94.2%。

### 间隔重复的现状

agent 记忆方向 2025-2026 **几乎没有**把 SM-2 式复习日程严格用于 agent 记忆的新论文（检索到的 spaced repetition 论文都在教育场景）。该生态位实际被三种工程化替代占据：MemoryBank 的 S+=1（每次访问即复习）、MemoryOS 的 N_visit 热度、MemOS 的 hot/cold 降级。**把 Ebbinghaus 复习日程真正排进"睡眠固化"是差异化空白机会**。

## 1.6 记忆准确性 / 防幻觉

### LongMemEval（arXiv:2410.10813，ICLR 2025）

- 五能力：信息抽取 / 跨会话推理 / **时间推理** / **知识更新** / **弃答(abstention)**；七个题型（single-session-user/-assistant/-preference/multi-session/knowledge-update/temporal-reasoning/abstention）。属性本体 164 个属性。500 题、~400 人时；LongMemEvalS ~115k tokens/题（~50 会话）、M ~1.5M。
- **知识更新题**：考察识别用户状态变化并"用最新信息作答"——这正是"正确引用知识点"的操作化。
- **时间推理题**：证据会话和问题都手工加时间戳，需同时利用元数据时间戳和文本内显式时间表述。
- **弃答题**：从正常题改造成 false-premise 问题（30 题），正确行为是"我不知道"。
- 关键发现：商用记忆系统大幅翻车——离线 GPT-4o 读全量 0.9184，**ChatGPT 记忆掉到 0.5773（-37%）**、Coze 0.3299（-64%）（ChatGPT 覆盖旧事实、Coze 不记间接信息）；长上下文 LLM 掉 30-60%。
- **最佳工程配方（可直接抄）**：记忆粒度取 **round 级**（非整会话，也非过度压缩的事实）；**检索键 = 值+事实扩展**（K=V+fact，recall@5 +9.4%、准确率 +5.4%）；**时间感知查询扩展**（temporal recall +6.8~11.3%，但弱模型会幻觉时间范围）；Chain-of-Note + JSON 阅读方式最多 +10 绝对分；**检索结果按时间戳排序注入**保证时间一致性。

### Graphiti / Zep（arXiv:2501.13956）——时间窗与引用 grounding 的标杆

- 三层子图：episode 子图（**无损原文存储**，消息/文本/JSON，带参考时间 t_ref）→ 语义实体子图（实体节点 name+summary；事实=实体间边；写入用**预定义 Cypher 查询**而非 LLM 生成查询）→ community 子图（label propagation 聚类 + map-reduce 摘要）。
- **双时态**：世界时间 T 与摄取时间 T′；每条边 4 个时间戳：`t′_created / t′_expired`（系统内何时产生/失效）+ **`t_valid / t_invalid`（事实在现实世界为真的区间）**。相对时间（"下周四""10 年前"）用消息 t_ref 解析，规则：ISO 8601、现在时事实的 valid_at=t_ref、只写年份→1 月 1 日。
- **矛盾处理 = 失效而非删除**：LLM 拿新边和语义相关的旧边比对，时间上重叠且矛盾时，"invalidates the affected edges by setting their t_invalid to the t_valid of the invalidating edge"，且按 T′ 新信息优先。历史完整保留 → 可回答"她以前住哪"。
- **检索管线 `f(α)=χ(ρ(φ(α)))`**：φ = 余弦 + BM25 + 图 BFS（分别对应语义/词面/图邻近三种相似）；ρ = RRF / MMR / episode-mentions 重排 / 节点距离重排 / 交叉编码器；χ = 构造器把每条边格式化为"fact + 日期区间"、实体为"name + summary"的 FACTS/ENTITIES 上下文——**回答自带时间来源，这就是 grounding 的实现**。
- 效果：LongMemEval_s 上 63.8(gpt-4o-mini)/71.2(gpt-4o) vs full-context 55.4/60.2（+15.2%/+18.5%），延迟 3.2s vs 31.3s（~90%↓）；temporal 类 +38~48%。
- **注意**：single-session-assistant 反而降 9~18%（助手原话类信息被图谱抽取稀释）——**逐字层仍必要**。另外 Zep 论文只和 MemGPT 比（DMR 94.8 vs 93.4）；"比 Mem0 高 18.5%"实为 Zep 对自己 full-context 的提升，别混淆两家的营销数字。

### 矛盾检测/更新机制横向汇总

- Mem0 的 tool-call 四操作（硬删）
- Mem0g / MemOS / Graphiti 的软失效（推荐）
- SuperMemory 的"auto-forgets expired info"（临时事实到期自动过期，如"明天考试"过日期自动失效）
- Hindsight 的信念 "strengthen/weakens/extends" 而非覆盖（每条 belief 保留 supporting evidence 精确引文 + proof count）
- MIRIX auto-dream 的合并去重
- 2026-08 新论文 *Governed Persistent Memory*（arXiv:2608.12476）：把"矛盾/过期/撤回的记忆能否支撑断言"做成双时态状态机 + fail-closed 释放

## 1.7 其他 2025-2026 新工作

### A-Mem（arXiv:2502.12110，NeurIPS 2025）

- Zettelkasten 式。笔记七元组 `m_i = {c_i, t_i, K_i(关键词), G_i(标签), X_i(上下文描述), e_i(嵌入), L_i(链接集)}`，属性由单次 LLM 调用生成（"≥3 个标签"、名词动词关键词、一句话上下文）。
- **链接**：新笔记嵌入召回 top-k 邻居后由 LLM 判断连哪些（无数值阈值，嵌入只是预筛）；相关笔记构成"box"，一条记忆可属多个 box。
- **演化**：新记忆会改写旧记忆的上下文描述和标签（actions: strengthen / merge / prune）。
- 检索纯余弦 top-k（默认 10，GPT 系调到 40-50），同 box 自动连带。LoCoMo multi-hop 45.85 vs 基线 18.41（GPT-4o-mini），token 仅 ~1,216-2,520（MemGPT ~17k）。消融：去链接+演化掉到 9.65/24.55。
- 局限：每次写入要 LLM 判链+演化，成本随记忆量涨；temporal 仍弱（12.14）。

### MemoRAG（arXiv:2409.05591，WWW 2025）

- 双系统——廉价**全局记忆模型**对超长上下文做 KV 压缩得到潜在全局记忆；查询时先生成**草稿答案当"线索(clue)"**，线索引导检索工具在长文中定位相关段；昂贵模型基于检索结果作答；用 RLGF（生成质量反馈强化学习）训练。
- 对 yuiju 的启发：**用日记摘要当 clue 生成器，去向量库/Mongo 里捞原文证据**。

### SuperMemory（29.0k★，商业+可自托管）

- 单一记忆结构和 ontology；"extracts facts, tracks updates, resolves contradictions, auto-forgets expired info"；profile 分 static（稳定事实）+dynamic（近期活动），~50ms。
- 自报 LongMemEval 分题型：KU 99%、Temporal 91%、Multi-session 93%；95% Recall@15、99.4% 上下文缩减。数字自报，参考即可。

### Hindsight（vectorize-io，20.2k★，arXiv:2512.12818）

- 四类 biomimetic 记忆（world facts / experiences / observations / mental models）分 bank 隔离。
- 核心是**"学习而非记住"**：事实持续合并为 observations（去重后的 belief），每个 belief "keeps its supporting evidence with exact quotes and a **proof count**"；新证据到来时 belief 被"strengthen, weaken or extend"而非覆盖。
- **mental models**：定义一个问题，后台持续改写答案。
- 检索 4 路并行（语义/BM25/图含实体-时间-因果/时间）+ RRF + cross-encoder。声称 LongMemEval SOTA 且被 Virginia Tech Sanghani Center 与华盛顿邮报独立复现。**这是目前"检索即强化 + 证据引用"结合得最好的开源工程实现**。

### MemPalace（58.5k★，2026-04 创建即暴涨）

- 反结构化流派——"stores your conversation history as **verbatim text**...does not summarize, extract, or paraphrase"；空间隐喻组织（people/projects=wings、topics=rooms、原文=drawers），检索可 scope。
- 本地 ChromaDB/Qdrant/pgvector 可插拔；附带 SQLite 时间知识图谱（add/query/**invalidate**/timeline，带 validity window）。
- **LongMemEval R@5 96.6%（零 LLM API）**、LoCoMo R@10 hybrid 88.9%。

### OpenViking（火山引擎，30.4k★）

- `viking://` 虚拟文件系统统一 memories/resources/skills，agent 用 `ls/tree/find` 浏览而非查询向量库。
- 写入时生成 **L0(摘要~100 tokens)/L1(概览~2k)/L2(全文)** 三层，检索先定位目录再逐层下钻、保留周围上下文；每条查询保留浏览轨迹可调试。
- LoCoMo 用户记忆 80-83%（原生 24-57%），输入 token −34~91%、延迟 −58~66%。

### TencentDB-Agent-Memory（23.3k★）

- 长期 **L0 原文→L1 原子事实→L2 场景块→L3 人设**金字塔 + 符号化短期记忆（工具输出存 `refs/*.md`、步骤摘要 jsonl、Mermaid canvas 在上下文中、node_id 下钻）。
- SQLite+sqlite-vec + 人性化 Markdown；BM25+向量+RRF 混检。
- **渐进触发**：L1 每 5 轮（或 600s 空闲）、L2 节流 900s、persona 每 50 条新记忆再生成、预热调度 1→2→4 翻倍；"下层保证据、上层保结构"，无不可逆压缩。token −61.4%、PersonaMem 48%→76%。

### ReFind（arXiv:2608.12888，2026-08）——对 yuiju 极重要的正面证据

- **不做任何 LLM 索引构建**，聊天档案原样保留、按"轮"粒度做词法索引，agent 用迭代关键词搜索 + 四个对话原生控制（会话感知 rank fusion、局部上下文扩展、时间范围收窄、跳过已查会话）。
- MemoryAgentBench 上 58.2 分**超过最强结构化对手（含 HippoRAG 2 的 53.2）**，LongMemEval-S/M 93.2/89.3。
- 结论："结构化记忆的很多收益，其实来自对原始记录的胜任检索"。**直接支持 yuiju 的 append-only 事件流路线：结构化层应该是索引而非真相源**。

### 2026-08 最新论文一瞥

- **RippleMem**（2608.13334）：从一次性检索改为联想式回忆、从锚点扩展找回分布式证据
- **LycheeMemory V2**（2608.12990）：语义段级巩固，构建 token −86%
- **MELD**（2608.16357）：多 agent 记忆合并协议、per-claim CRDT
- **D²ACCI**（2608.17756）：记忆管线失败定位协议
- **Harness the Memory**（2608.15008）：26 指标下**没有任何记忆底座全面胜出**，应按场景路由
- **Total Recall at What Cost**（2608.11879）：精度与成本不可兼得
- **EgoCITE**（2608.12627）：上下文富索引+时间感知检索，成本降 36 倍
- **SuperLocalMemory 4.0**（2608.08253）：治理型记忆 OS
- **Agent Memory Distillation**（2608.07169）：教师层级记忆蒸馏给小模型 +27 分
- **MemoryCPT**（2608.04843）：成本感知 GRPO 优化记忆管线
- 评测基础设施：[AML-memory/agent-memory-leaderboard](https://github.com/AML-memory/agent-memory-leaderboard)（2026-07，796★）；综述配套：[Shichun-Liu/Agent-Memory-Paper-List](https://github.com/Shichun-Liu/Agent-Memory-Paper-List)（"Memory in the Age of AI Agents"综述）

### HippoRAG 2 与 MEM1

- **HippoRAG 2**（arXiv:2502.14802，ICML 2025）：海马体索引建模——LLM 当新皮层、开放知识图谱当海马体、短语检测当内嗅皮层；**Personalized PageRank** 一步完成多跳联想检索；联想记忆任务比 SOTA 嵌入模型 +7%；单步检索比迭代检索便宜 10-30 倍、快 6-13 倍。
- **MEM1**（arXiv:2506.15841）：RL 端到端学"每轮把新观察合并进单一常驻状态、丢弃无关信息"，上下文恒定长度；16 目标多跳 QA 上 7B 模型 3.5× 性能、3.7× 内存缩减。

---

# 第二部分：人类记忆科学 → AI 记忆系统映射

## 2.1 多存储模型（Atkinson-Shiffrin / Baddeley）

**科学结论**：

- Atkinson-Shiffrin（1968）：感觉记忆（图像 0.5–1s、声像 1.5–5s，容量近乎无限）→ 短时记忆（无复述约 18–30 秒，7±2 组块，复述可维持并送入长期）→ 长期记忆（容量与时长近乎无限）。经典证据是海马双侧切除患者 H.M.：短时记忆完好但无法形成新长时记忆。
- Baddeley & Hitch（1974）把"短时记忆"重构为**工作记忆**：中央执行（注意控制/任务切换/抑制）+ 语音回路 + 视空间画板 + 情景缓冲区（2000 年加入；有限容量、负责把各来源信息整合成有时间顺序的单一表征）。双任务实验证明不同模态子系统可并行。
- 主要批评：LTM 不能当单一仓库（Tulving），复述不是唯一编码途径（加工水平理论）。

**AI 映射**：

- 感觉记忆 = 通道原始事件流（QQ 消息、web 输入、世界引擎 tick），先落 append-only 事件日志，不做任何加工判断。
- 工作记忆 = **LLM 上下文窗口 + prompt 组装区**。CoALA（arXiv:2309.02427）正式化了这一映射：working memory 是上下文内信息，episodic/semantic/procedural 是上下文外存储，决策过程 = "从长期记忆检索 → 注入工作记忆 → 推理 → 行动 → 学习（决定写回哪种记忆）"。
- Baddeley 的工程启示：**工作记忆是主动加工场所，有硬预算（情景缓冲区的有限容量 = 注入 token 预算），不同来源/模态的信息先各自缓冲再整合**。web 通道与 QQ 通道应各有独立会话缓冲，组装 prompt 时统一进一个预算槽。
- 人脑容量层级暗示显式分三层：**热状态（当前 tick/当前会话）→ 暖上下文（当日）→ 冷存储（全部历史）**。

## 2.2 Tulving 分类：episodic / semantic / procedural

**科学结论**：

- Tulving（1972）：情景记忆 = 带**时间、地点、情绪、时空关系**标记的事件记忆，伴随"remembering"和自知意识（心理时间旅行）；语义记忆 = 事实与概念，"knowing"，**由情景记忆积累派生**；程序性记忆 = 技能与"怎么做"（H.M. 的运动技能学习不受海马损伤影响——三类记忆编码机制确实不同）。
- 情景记忆像"地图"把语义条目联结起来；语义与情景在提取时协同而非竞争。

**AI 映射**：

- episodic = 原始对话/事件经历（带时间戳、通道、参与者、情绪标注，**不可变、永久保留**）
- semantic = 提炼出的事实与画像（可更新、可失效）
- procedural = 技能与习惯：提示词模板、作息流程、安慰方式、工具调用套路
- 三个存储的**写策略完全不同**：episodic 只追加；semantic 需要 Mem0 式两阶段；procedural 需要版本化（习惯会改）。
- 关键点：**episodic→semantic 的派生关系是人类和 AI 共同的语义记忆来源**——语义层是情景层的衍生物，坏了可以重建，情景层才是 source of truth。

## 2.3 记忆巩固与"睡眠"

**科学结论**：

- 两个时间尺度：突触巩固（分钟–小时，LTP）与**系统巩固**（天–年，海马快速索引 → 皮层慢速永久存储）。
- 标准巩固理论（Squire & Alvarez 1995）：依赖记忆痕迹的**反复再激活**（尤其睡眠中）逐步强化皮层连接。多重痕迹理论（Nadel & Moscovitch 1997）反驳：情景记忆永远依赖海马，海马损伤患者"保留"的旧记忆其实是被**语义化、去细节**的产物。
- 再巩固（reconsolidation）：已巩固的记忆被提取后会暂时失稳、需重新稳定——**提取本身就是修改的机会**。
- 睡眠分工：前半夜 NREM 慢波（SWS）巩固陈述性记忆（低乙酰胆碱水平允许海马重放）；后半夜 REM 巩固程序性记忆。海马 sharp-wave ripple 重放：NREM 期间 50–200ms 内 15–30% 神经元同步放电，以时间压缩形式**按序重放**当日经历。睡眠纺锤波与巩固的传统关联存在争议（53 项研究元综述称无关），较稳的结论是 spindle-ripple 耦合。睡眠还会**选择性优先巩固带价值/奖励标记的记忆**。

**AI 版"睡眠巩固"应包含的五个动作**（每个都有神经科学对应物）：

1. **Replay（重放）**：重读当日及近几日 episodes——对应 SPW-R 压缩重放
2. **语义化抽取（情景→语义）**：episodes → facts，细节脱去、结论入库；**原文不删**——对应"海马保留原始情景索引"
3. **重要性选择**：只巩固高重要度记忆（睡眠的奖励优先效应；可对"主人情绪事件"加权）
4. **整合（integration）**：新事实与旧知识连结、合并聚类（人类睡眠能把新词嵌进既有词库）
5. **间隔重放**：对"高重要但久未访问"的记忆安排重放，而非只处理当天

另外，再巩固理论支持"检索时允许更新"：矛盾事实在检索命中时即可触发失效仲裁，不必等夜间。

## 2.4 遗忘机制

**科学结论**：

- Ebbinghaus（1885，节省法）：原始拟合 `b = 100k/((log t)^c + k)`，c=1.25、k=1.84；工程常用的 `R = e^(−t/S)` 对数据拟合其实一般；Murre & Dros 2015 忠实复现了原曲线。要点：重复会延长下次复习的最优间隔。
- 干扰 vs 衰退：前摄/倒摄/输出干扰有实验证据（干扰可使表现下降至多 20%）；纯衰退难以与干扰分离。当前更主流的观点：**大多数"遗忘"是提取失败（线索依赖遗忘）——记忆还在，只是不可及**。
- 适应性：Schacter《七宗罪》的核心论点是这些缺陷是适应性特征的副产品；反证是"不能遗忘"是病（PTSD、超忆症）。遗忘的功能：抗干扰、压缩、支持泛化。

**AI 映射**：

- **遗忘 = 降权，不是删除**。给每条记忆可检索性分数（strength），指数衰减 + 检索强化；原文永远留在 episodic 归档。
- 干扰理论的直接警示：**高度相似的记忆会互相污染**（AI 场景 = 用户说过的矛盾信息、模型编造内容入档）。对策 = 矛盾检测与失效标记 + 审核门禁防编造内容进长期记忆。
- "不可能全存"的正确解法不是删，而是**三级降权**：热层（原文）→ 固化层（摘要+事实）→ 归档层（原文压缩存储、不参与日常检索、可全量重建索引）。

## 2.5 检索练习效应与间隔效应

**科学结论**：

- Testing effect（Roediger & Karpicke 2006）：**提取一次胜过重读十次**；立即测试时重读占优，**延迟测试反转**；Rowland 2014 元分析确认。提取努力假说：适度困难的成功提取产生更持久记忆。
- Spacing effect：Cepeda 2006 元分析 271 例中 259 例分散练习胜出；Bahrick 1993 九年外语研究：56 天间隔优于 28/14 天；经验法则：最佳复习间隔约为目标保持期的 10–20%（领域常识，采用时自行标注）。

**AI 映射**：

- **被检索的记忆必须被强化**：命中即 UPDATE last_accessed_at / access_count+1 / strength 提升。Generative Agents 的 recency 项精确做到这一点——衰减按"自**最近一次被检索**（非创建）起的小时数"以 0.995^h 计算，检索本身就是续命。
- 间隔效应 → 夜间 job 应对"高 importance、低 access_count"的记忆安排**主动重放**（重新摘要、刷新 embedding、必要时在角色独白/日记里引用一次），防止重要记忆变成永不再命中的僵尸数据。
- "提取努力"启发：检索不要只取 top-1，跨主题多命中（top-k 且按分数分层）再让 LLM 综合的巩固效果更好。

## 2.6 来源记忆、时间记忆与元记忆（FOK）

**科学结论**：

- 来源记忆（source monitoring）：**记住内容、忘记来源极其常见**，错误归因是 Schacter 七宗罪之一；来源信息比内容信息更脆弱。
- 时间记忆：情景记忆自带时间标记，这也是 Tulving 与语义记忆的分界。
- 元记忆：FOK（Hart 1965，能认出但提取不出的预判）与舌尖现象（TOT，即将提取感）分离；元记忆监控指导学习决策。Remember/Know 范式：人类回忆自带"我记得"vs"我知道"的质的不同。

**AI 映射**：

- 每条记忆必须带 **provenance**（来源 event_id 链、通道、说话者、原始时间戳）与**时间有效期**（双时态）。注入 prompt 时带上来源标注（"你在 2026-03 于 QQ 说过……"），角色不会张冠李戴。
- **置信度标注 = AI 的 FOK**：每条记忆存 confidence（提取时 LLM 置信 × 检索相似度 × 冲突计数），输出时映射为确定性措辞分级：高置信 →"我记得你说过"；中 →"好像/印象里是"；低 →"我是不是记错了，你是说……吗？"。低置信应触发**主动求证问句**（人类 TOT 的行为就是去查）——**高置信的错话比低置信的对话伤害大得多**，这对陪伴类角色的信任感至关重要。

---

# 第三部分：本地优先单用户的存储工程

## 3.1 SQLite + sqlite-vec / LanceDB vs Qdrant

- **sqlite-vec**（asg017，sqlite-vss 的继任者，Mozilla Builders 资助）：pre-v1，官方明示会有 breaking changes。vec0 虚拟表，支持 float/int8/binary 向量与元数据列/分区键，KNN 为**暴力扫描**（实验性 IVF/DiskANN 源码存在但非正式功能）；npm 可装，better-sqlite3 / node:sqlite 均可 loadExtension；有浏览器 WASM 版。定位 "fast enough"。
- **node:sqlite 已达 Stability 1.2（Release Candidate）**：v22.13+ 免 flag，v25.7 升 RC；同步 API，支持 loadExtension。better-sqlite3 仍是生态最成熟选择，node:sqlite 是"零原生编译"的替代。
- **LanceDB**：嵌入式（进程内、无服务器）、Lance 列式格式、**零拷贝自动版本化**、向量+全文+SQL 混合检索、TS/JS SDK 一等公民（@lancedb/lancedb），Apache-2.0。
- **Qdrant**：成熟服务端方案，但需要独立进程；其客户端 local mode 官方定位是"开发/原型/测试"，不是生产。
- **结论**：单主人场景记忆量级约 10⁴–10⁵ 条向量，暴力扫描完全够（毫秒级），**嵌入式方案成立且更契合本地优先**。sqlite-vec 与 LanceDB 二选一：要"一切在一个文件、备份=拷文件"选 sqlite-vec；要全文检索+数据版本化选 LanceDB。Qdrant 可退役（或留作未来多角色大规模的可选后端）。

## 3.2 浏览器端（IndexedDB/OPFS/WebLLM）是否可行

- 技术上：OPFS 提供私有文件系统（worker 内有同步句柄，适合 WASM/SQLite）；但 OPFS 与 IndexedDB **共享源配额且可被浏览器驱逐**（需 navigator.storage.persist()，且不保证）；WebLLM 可跑量化 8B 级模型，但 service worker 随时可被杀、首次加载慢。
- **决定性因素在产品形态**：QQ 通道（OneBot/NapCat 协议）无法跑在浏览器里，必须常驻本地服务进程；而需求是"web 端为主 + QQ 复用同一记忆核心"——只要有一个通道是服务进程，记忆核心就该放进程里，浏览器只做 UI。
- **结论**：浏览器存储只配做**只读镜像/离线缓存**，不做记忆主存。正确形态是本地 Node 常驻进程（服务 UI + 通道适配器），恰好与现有结构（packages/satorijs-adapter-onebot + packages/web）吻合。

## 3.3 SQLite(WAL) vs DuckDB vs 文件树+清单

- 记忆数据特征：**只增不改的事件流 + 定期固化的衍生物 + 少量可更新的 facts**。
- SQLite：OLTP，高频小事务、读写并发（单写者）、单文件、工具生态无敌；WAL 模式追加写、自动 checkpoint（默认 1000 页≈4MB）。
- DuckDB：OLAP 向量化引擎、批量 MVCC，**为大批量分析优化，不适合高频小写入的在线负载**；仅当要做角色行为大规模统计分析时才值得引入。
- 文件树+清单（Markdown）：人可读、可 git diff（EverOS/memU 路线），但无事务、一致性弱、检索需重建索引。
- **结论**：system of record 用 SQLite(WAL)；把固化产物（日记、画像、技能卡）**同时导出 Markdown 镜像**给人看/给 git——兼得可读性与可靠性。DuckDB 不进核心链路。

## 3.4 防丢失工程

- **WAL**：NORMAL 模式断电可能丢最近事务但**不会损坏库**、速度快；FULL 每提交 fsync。坑：手工复制数据库必须连 -wal/-shm 一起，否则可能损坏；NFS/网络文件系统上不能跑 WAL；长读事务会饿死 checkpoint 使 WAL 无限增长。
- **事件溯源**（Fowler）：状态 = 事件重放，天然获得全量重建、时态查询、审计；**对 yuiju 只需取其神不取其形**：events 表 append-only 即可，不必全套 ES 框架。
- **快照+增量**：每日 `VACUUM INTO` 生成一致性单文件快照（SQLite 官方在线备份路径）+ 保留滚动窗口 + 异地副本；逻辑层做"事件流(不可变) + 定期物化快照(加速重建)"。
- **Corruption 防护**：SQLite 原生无页校验和 → 应用层每条事件带 sha256；快照带整库校验；3-2-1 备份（本地多代 + NAS/加密离线）；**定期恢复演练**。
- **最根本的一条**：**一切衍生层（facts、向量索引、日记）都能从 events 全量重建**，任何索引损坏都不致命。KokoroMemo 正是这个哲学：LanceDB 索引是"可重建缓存"，备份只需 SQLite + conversations + config。

## 3.5 开源"本地优先记忆层"参考

| 项目 | 形态 | 关键做法 | 可借鉴 |
|---|---|---|---|
| **KokoroMemo**（CyrilPeng，Python，MIT，活跃） | 本地 OpenAI 兼容代理(127.0.0.1:14514/v1)，面向 AIRP/桌宠/游戏，与 yuiju 场景几乎重合 | SQLite 为正式记忆、LanceDB 仅为可重建缓存（LanceDB 挂了降级 SQLite+numpy）；新记忆进**收件箱审核门禁**防污染；全局/角色/会话三级作用域；Retrieval Gate 先判断本轮要不要检索；注入 trace 面板；X-User/Character/Conversation-Id 头隔离 | "SQLite 为准+向量可重建"、审核门禁、作用域隔离、检索门控 |
| **EverOS**（EverMind-AI，Python，Apache-2.0，12.2k★） | "可移植记忆层"：Markdown+SQLite+LanceDB，零外部服务 | **Markdown 是唯一事实来源**（可读可编辑可 git，cascade watcher 自动重同步索引）；双轨记忆：用户侧 episodes/profile，agent 侧 cases/skills，另有 Knowledge Wiki；离线 Reflection 合并 episode 簇；三档检索(keyword/hybrid/agentic) | Markdown 镜像+文件监听同步、用户/agent 双轨、cases(经历案例)这一层 |
| **memU**（NevaMind-AI，Apache-2.0，14.3k★） | agent 驱动记忆，核心逻辑约 500 行 | 会话日志→切片→agent 自判新建/修补/跳过→Markdown 技能文件；SQLite 内置暴力余弦检索 | "核心极小可审计"；把检索判断交给宿主 agent |

相关生态：Mem0 有 OpenMemory 本地版；Graphiti 支持嵌入式 falkordblite 可全自托管；HippoRAG 适合未来做多跳记忆关联。

---

# 第四部分：yuiju 类人记忆架构设计

## 4.1 分层模型（认知科学 → 系统映射）

```
L0 事件流 (episodic)      = 现有 episode，append-only，永不删 —— 唯一真相源
L1 语义记忆 (semantic)     = 新增 facts 表，从 episode 巩固而来，带双时态/重要度/置信度/来源链
L2 程序记忆 (procedural)   = 角色的习惯与技能（远期，生活模拟独有）
C  核心记忆块 (core)       = 现有 core/person memory 演化：persona 块 + 对主人认知块，常驻 prompt，限额管理
```

关键原则：**L1/L2/C 全部是 L0 的衍生物，坏了随时可重建；L0 永不物理删除**。

## 4.2 L1 语义记忆的数据结构（核心新增）

```ts
interface SemanticFact {
  id: string;
  subject: "master" | "self" | "world";   // 单主人后 person-memory 大幅简化
  content: string;                         // "主人喜欢猫，对狗毛过敏"
  importance: number;                      // 写入时 LLM 打 1-10
  confidence: number;                      // 证据充分度
  tValid: Date; tInvalid?: Date;           // 事实为真区间（世界内时间）
  tCreated: Date;                          // 摄取时间（现实时间）→ 双时态
  sourceEventIds: string[];                // 来源链 → 引用的 grounding
  strength: number;                        // MemoryBank 式记忆强度 S
  lastRetrievedAt: Date;                   // 检索即强化的锚点
  accessCount: number;
  status: "active" | "invalidated" | "archived";
}
```

## 4.3 写入管线：现有提案-审查 + 升级为四操作

保留现有 proposal-review 双模型防污染（行业少有的好设计），但把「整 section 覆盖」改为 Mem0 式操作语义：

- **ADD**：新事实（无等价旧事实）
- **UPDATE**：新信息量超过旧事实才替换，保留版本链
- **INVALIDATE**：矛盾时置 `tInvalid`，**不删**（她还记得你以前的样子）
- **NOOP**：无新信息

## 4.4 检索管线：混合 → 三因子重排 → 强化 → 带出处注入

```
查询 → 查询扩展（值+事实扩展）
     → 混合检索（向量 + 关键词 + 元数据过滤：作用域/时间窗/有效性）
     → 三因子重排 score = relevance + importance + 0.995^(距上次检索小时数)
     → 命中即强化（lastRetrievedAt=now, accessCount+1, strength+1）   ← 检索即巩固
     → 按时间戳排序，格式化注入：
       "「2026-03-12 · QQ」你说过自己对狗毛过敏（当前仍有效）"
       "「2026-05 · 网页」你喜欢猫（印象中，不太确定）"
```

**置信度映射措辞分级**（对应人类元记忆 FOK / Remember-Know 范式）：

- 高置信（多证据/近期/高 accessCount）→ "我记得你说过……"
- 中 → "印象里你是……来着？"
- 低 / 已失效但仍命中 → "我是不是记错了，你之前是不是……？"
- 检索不到 → **弃答**："这个我真没印象了"——而不是编造

## 4.5 睡眠巩固 job（升级现有入睡固化，五动作）

1. **Replay**：重放当日 + 近几日 episode
2. **语义化**：episode → facts（四操作写入 L1），原文不删
3. **重要性选择**：只有 importance 达标的才巩固（睡眠优先巩固带价值标记的记忆）
4. **整合**：新事实与旧事实连结（简化版 A-Mem：事实↔事件↔日记三类固定边即可，不必全量互链）
5. **间隔重放**：对「高 importance、低 accessCount」的记忆重新刷新 embedding/在日记里引用一次——防止重要记忆变成永不被检索的僵尸

日记从"摘要任务"升级为 sleep-time compute：除日记外，顺产「关于主人的推断集」写入 core 块（Letta 论文：成本摊销约 10 倍）。

## 4.6 存储架构：本地单主人 + QQ 复用

**部署形态**：

```
本机常驻 Node 进程（记忆核心 + 世界引擎 + web 服务）
 ├─ web UI（浏览器访问 localhost，只做界面）
 ├─ QQ 适配器（现有 satorijs-adapter-onebot，复用同一核心）
 └─ SQLite 单文件（WAL）+ Markdown 镜像目录
```

记忆核心只此一份，通道无所谓——web 优先、QQ 复用自动成立。与现有 packages 结构天然吻合：`world`/`utils` 是核心，`web` 和 `message` 都是它的客户端。

**存储映射**：

| 数据 | 现状 | 目标 |
|---|---|---|
| 事件流（episode） | MongoDB | SQLite `events` 表（append-only + sha256） |
| 语义事实（L1，新增） | — | SQLite `facts` 表 |
| 日记 | MongoDB | SQLite + **Markdown 镜像**（人可读、可 git） |
| 核心记忆块 | 本地文件 `memory.md` | SQLite `blocks` 表 + Markdown 镜像（限额管理） |
| 向量索引 | Qdrant 独立服务 | sqlite-vec / LanceDB，**标记为可重建缓存** |
| 实时状态（情绪/进行中行为） | Redis | 进程内存 + 周期写回 SQLite |

单用户场景下 Mongo+Redis+Qdrant 三个容器全部退役，部署变成「一个进程 + 一个数据目录」——本身即产品化卖点（对标 EverOS 12.2k★ 的本地优先定位）。

**防丢失四层**：

1. **WAL + synchronous=NORMAL**：断电最多丢最后一笔事务，库不损坏
2. **每日 `VACUUM INTO` 快照**：滚动 30 天 + 每月一份，拷到第二块盘/NAS
3. **events 逐条 sha256 + 快照整库校验**
4. **根本层：一切衍生物可从 events 全量重建**（维护 rebuild 脚本）——向量索引损坏、facts 表损坏都不致命，重算即可

## 4.7 "不可能全存"的澄清

**LLM 记忆系统的瓶颈从来不是存储成本，是检索时的上下文预算**：

- 十万条事件 ≈ 几十 MB SQLite，存储成本趋近于零；"全存"完全可行，且 ReFind 证明全存原文反而检索质量更高
- 真正的约束是：每次回复只能注入几千 token 的记忆 → 所以要控制的是"**什么进入日常检索池**"，不是"什么被保存"
- 三层预算：**热**（core 块常驻，几百 token）→ **温**（active facts 参与检索，三因子排序取 top-k）→ **冷**（invalidated/archived facts 和全部原文，只在显式回忆时按时间窗查）
- "遗忘"发生在检索分数（`e^(-t/S)` 让久不用的记忆排不进 top-k），不发生在存储层——她"想不起来"但"看到日记还能想起来"，这正是人类遗忘的运作方式

## 4.8 建议落地顺序

1. **第一步：L1 语义记忆 + 四操作写入**（改造 person-memory，解决覆盖丢历史）——纯机制改动，不动存储
2. **第二步：三因子检索 + 检索即强化 + 带出处注入**（改造 memory-retrieval）——"正确引用"在这一步达成
3. **第三步：探针评测**（knowledge-update / temporal / abstention 三类各 20 题）——验收"像真人"
4. **第四步：SQLite 本地化迁移**（Mongo/Qdrant/Redis → 单文件）——与机制解耦，是独立的部署简化里程碑
5. 远期：程序记忆（procedural）、间隔重放、A-Mem 式互链

前三步在现有基础设施上即可完成，立刻提升记忆质量；第四步等机制稳定后一次性迁移，避免边改机制边换存储。

## 4.9 待拍板问题

1. **存储迁移时机**：项目约定"早期阶段按最佳方案设计不需兼容旧逻辑"，可一步到位把 SQLite 迁移放第一步（机制在终态存储上开发）；或机制先行、存储后迁。倾向后者，但两条路都成立。
2. **双时态的世界时间**：世界时间与现实时间当前是否 1:1？若将来要加速/暂停世界，应尽早把"世界内时间"字段加进 events（越晚加迁移成本越高）。
3. 单主人化对 person-memory 的简化（多人格 section → master 单一 subject）是否立即执行，还是保留多用户能力过渡一段。

---

# 附：与现有代码的差距清单（调研时点）

- 记忆没有 importance 与三因子检索——Qdrant 语义检索是纯 relevance 排序
- 单一时间轴——所有时间字段都是现实时钟，无双时态
- person memory 整 section 覆盖写丢历史；热度清理直接 unlink 文件
- episode 没有语义检索——"今天之前的精确回忆"只能靠日记（二次加工，有损）
- core memory 是无结构整篇 Markdown，全文重写风险高，无 block 限额
- 对话摘要依赖可选的 `summaryText`，缺摘要时退化为零信息量条目
- core/person memory 存本地文件，与"Redis 实时真相源 + MongoDB 可追溯记录"的架构约定不一致，且阻碍未来多端（桌宠）同步
