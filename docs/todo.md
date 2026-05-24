## TODO

- 继续改造 message 模块，采用 satori XHTML 形式的消息体内容
- 群聊消息也存一下 redis，用于服务重启时可以恢复消息记录，如果时间过长的话直接丢弃
- Action 模块能力拓展
- 调研一下 b 站直播的接入
  - [blive-message-listener](https://github.com/ddiu8081/blive-message-listener)
- 最新的消息测回时，应该取消当前的 LLM 调用，重新执行

### World 模型增强

- 开始使用主地点和副地点，将咖啡店和商店纳入商业区，这是整个城市的中心。
- 新增超市（商业区），用于购买食材
- 新增快餐店，用于解决三餐问题
- 新增做饭 Action
- 新增池塘（与公园、神社，归结为一个主区域），可以钓鱼

## 想法

- 按照 DDD 规范，规范现在的 Redis 与 Mongodb 操作
- 睡觉叫醒机制
- 实现钓鱼功能
- 物品售卖机制
- 实现做饭功能
- 监控告警
