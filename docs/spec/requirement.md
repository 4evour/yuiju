# 背景

`packages/world/src/action` 当前都是在用 location.major 来判断地点，没有利用到 location.minor。

@yuiju/world 当前的地点有点复杂，模型只会去几个固定的地点，有些地方根本就不会去，比如：神社和海边。

# 期望

我期望将一些地点融合为 location.major，例如：将咖啡店和商店纳入商业区

# 问题

1. 当前只用两个维度（major，minor）来展示地点是否合适，是否可以对应未来的需求。当前的世界设定主要还是一个小镇。
2. 这种多维度的地图，如何让 Agent 更好地理解地图上的关系？ `packages/utils/src/prompt/world-map.ts`
3. 多维度的地图，如何让 Agent 更好的做出决策（地点之间的移动）。
   - 这个很好解决，在 precondiction 内筛选就好了。
