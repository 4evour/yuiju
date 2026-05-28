## 群聊消息

```
Session {
  id: 9,
  sn: 9,
  event: {
    selfId: 'ou_661061904a58fa11bb239935b8109132',
    platform: 'lark',
    timestamp: 1779988346147,
    _type: 'lark',
    _data: {
      schema: '2.0',
      header: [Object],
      event: [Object],
      type: 'im.message.receive_v1'
    },
    referrer: { type: 'im.message.receive_v1', event: [Object] },
    type: 'message-created',
    subtype: 'group',
    channel: { type: 0, id: 'oc_f3820e0bf03880762aa21b5d063ff30f' },
    user: { id: 'ou_ad1f37806468c94859ed3c733eaef379' },
    message: {
      id: 'om_x100b6eb3396d70a4b291aa6188bff12',
      quote: undefined,
      elements: [Array]
    },
    guild: { id: 'oc_f3820e0bf03880762aa21b5d063ff30f' }
  },
  locales: [],
  Symbol(cordis.tracker): { associate: 'session', property: 'ctx' }
}
```

## 私聊消息

```
Session {
  id: 8,
  sn: 8,
  event: {
    selfId: 'ou_661061904a58fa11bb239935b8109132',
    platform: 'lark',
    timestamp: 1779988333180,
    _type: 'lark',
    _data: {
      schema: '2.0',
      header: [Object],
      event: [Object],
      type: 'im.message.receive_v1'
    },
    referrer: { type: 'im.message.receive_v1', event: [Object] },
    type: 'message-created',
    subtype: 'private',
    channel: { type: 1, id: 'oc_3155b7bb229ec191b9d996f689f4c868' },
    user: { id: 'ou_ad1f37806468c94859ed3c733eaef379' },
    message: {
      id: 'om_x100b6eb3381c90a0b4c51285b732b5a',
      quote: undefined,
      elements: [Array]
    },
    guild: { id: 'oc_3155b7bb229ec191b9d996f689f4c868' }
  },
  locales: [],
  Symbol(cordis.tracker): { associate: 'session', property: 'ctx' }
}
```
