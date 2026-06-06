# 技术方案

## 超市通用售卖 Action

### 本次要解决的问题

当前可以在「水音池」钓鱼，钓到的鱼会作为食材进入背包，并带有 `metadata.salePrice` 售卖价格。鱼已经具备“可售卖”的物品数据，但世界里还没有一个明确的售卖 Action 和售卖地点。

本次新增一个发生在「商业区-超市」的售卖 Action，让角色可以把背包里有售卖价格的物品卖掉。当前主要覆盖鱼这类食材；未来如果其他物品也需要售卖，只要进入背包时带有明确的 `metadata.salePrice`，就可以进入同一条售卖流程。

### 预计修改范围

- `packages/utils/src/types/action.ts`
  - 新增 ActionId，建议命名为 `Sell_Item_At_Supermarket = "在超市售卖物品"`。
- `packages/world/src/action/business-district/supermarket.ts`
  - 在 `supermarketAction` 中新增售卖 Action。
  - 售卖 Action 与现有购买食材 Action 同属超市场景。
- `packages/utils/src/prompt/world-view.ts`
  - 新增选择售卖物品的 prompt，例如 `chooseSellableItemPrompt`。
  - prompt 说明候选物品来自背包，只能选择候选列表中的物品，并按库存选择合理数量。
- `packages/world/src/llm/agent/business-district.ts`
  - 新增 `chooseSellableItemAgent`。
  - 结构贴近现有商品/食材选择 agent，但业务语义是选择要出售的背包物品。
- `packages/utils/src/prompt/world-guide.ts`
  - 在「商业区-超市」的 `availableActions` 中加入新增售卖 Action。
  - 将超市介绍从“购买食材”扩展为“购买食材，出售物品”。
- `packages/utils/src/prompt/world-view.ts`
  - 同步世界观里的超市说明，避免模型认为“鱼有价格但没有售卖地点”。

### 主流程变化

新增 Action 的执行流程：

1. 角色位于「商业区-超市」。
2. Action precondition 检查背包里是否存在可售卖物品。
3. 可售卖物品定义为：
   - `quantity > 0`
   - `metadata.salePrice` 存在
4. 将可售卖物品整理成候选列表，候选描述包含：
   - 物品名称
   - 当前库存
   - 售卖价格
5. 调用 `chooseSellableItemAgent`，让 LLM 从候选列表里选择要出售的物品列表和每种物品的数量。
6. 如果 LLM 返回了重复物品，按物品名合并数量。
7. 根据当前库存裁剪每种物品的售卖数量，避免超过背包数量。
8. 逐个调用 `context.characterState.consumeItem` 扣除背包物品。
9. 调用 `context.characterState.changeMoney` 增加本次总金币收入。
10. 返回本次售卖结果，供 Action 生命周期记录和下一次 tick 使用。

### 新增概念与取舍

本次新增的稳定业务语义只有一个：

- “可售卖物品”：背包中带有 `metadata.salePrice` 的物品。

不新增独立交易系统、售卖配置、价格表、回收站、鱼市或店铺服务层。售卖价格继续以物品自身 metadata 为真相源，Action 只负责按当前背包状态完成一次出售。

这样做的原因：

- 当前鱼已经把售卖价格写在物品 metadata 中，复用现有事实即可。
- 超市已经是食材交易场景，把售卖放在这里比放在水音池更符合场景边界。
- 未来其他物品如果可售卖，可以通过明确写入 `metadata.salePrice` 接入，不需要提前引入额外框架。

### 状态变化与副作用

本次 Action 会修改 Redis 中的角色实时状态：

- 当前 action 变为新增售卖 Action。
- 背包中被出售物品数量减少；数量归零时由现有 `consumeItem` 逻辑移除该物品。
- 金币增加，增加金额为所有售卖物品的 `salePrice * quantity` 之和。

本次不直接新增 MongoDB 写入逻辑。行为开始、完成和历史记录继续走现有 Action 生命周期。

### 明确不在本次范围内

- 不新增「鱼市」「回收站」等新地点。
- 不新增任何配置项或运行约定。
- 不新增按地点区分的售价倍率。
- 不新增税费、手续费、折价、议价等经济系统。
- 不支持“全部出售”这类额外命令语义；本次只支持从候选物品中选择一个或多个物品并出售指定数量。
- 不改水音池钓鱼概率和鱼的产出逻辑。
- 不改做饭逻辑。

### 验证命令

实现完成后执行：

```bash
pnpm run format:write
pnpm run lint
pnpm run type-check
```
