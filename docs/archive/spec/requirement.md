# 需求

新增"玩手机"的功能

## 思路

- 使用工具：Hermes Agent
- 接入方式：部署 Hermes Agent，通过 API 的方式调用 [API Server Doc](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server#post-v1chatcompletions)
- 手机的各种功能通过 skill 来实现，目前只支持云旅游 `packages/source/skills/mapillary/SKILL.md`

例如：

```json
{
  "model": "hermes-agent",
  "messages": [
    { "role": "system", "content": "You are a Python expert." },
    { "role": "user", "content": "Write a fibonacci function" }
  ],
  "stream": false
}
```

## 大致方案

在项目的 config 里新增配置：hermes-agent 的 base url，与 api key，利用 ai sdk 调用 hermes-agent 的 api。hermes-agent 的 api 是兼容 open ai 规范的。

新增 action：「玩手机」，agent 选择这个 action 时，需要在 reason 中给出要用手机干什么，然后调用一次 LLM 解读这个 reason 给出一份结构化的数据，根据不同的功能给 hermes 注入不同的提示词（本次只用考虑云旅游），最后调用 hermes-agent 的 api。
对于“云旅游“这个 skill，hermes agent 最终会用悠酱的口吻输出一份描述。

手机有电量机制，每次选择「玩手机」时会消耗电量，执行三次 「玩手机」 后，需要充电。新增「给手机充电」action，只能在家中进行
