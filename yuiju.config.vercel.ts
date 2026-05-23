import { defineYuijuConfig } from "./packages/utils/src/config/config-schema";

const config = defineYuijuConfig({
  app: {
    publicDeployment: true,
    timezone: "Asia/Shanghai",
    memoryDir: "/tmp/yuiju/memory",
  },
  database: {
    mongoUri: "",
    redisUrl: "",
    syncMongoUri: process.env.YUIJU_SYNC_MONGO_URI,
    syncRedisUrl: process.env.YUIJU_SYNC_REDIS_URL,
  },
  llm: {
    deepseekApiKey: "",
    siliconflowApiKey: "",
    models: {
      chat: [
        {
          baseUrl: "",
          apiKey: "",
          model: "",
        },
      ],
      strong: [
        {
          baseUrl: "",
          apiKey: "",
          model: "",
        },
      ],
      flash: [
        {
          baseUrl: "",
          apiKey: "",
          model: "",
        },
      ],
      vision: [
        {
          baseUrl: "",
          apiKey: "",
          model: "",
        },
      ],
    },
  },
  message: {
    internalApi: {
      host: "127.0.0.1",
      port: 3020,
    },
    proactive: {
      onebotGroupTargetId: 0,
      larkGroupTargetId: "",
    },
    onebot: {
      protocol: "ws",
      selfId: "",
      endpoint: "",
      token: "",
      retryTimes: 6,
      retryInterval: 5000,
      retryLazy: 60000,
      responseTimeout: 120000,
      whiteList: [],
      groupWhiteList: [],
    },
    lark: {
      protocol: "ws",
      endpoint: "https://open.feishu.cn/open-apis",
      appId: "",
      appSecret: "",
      retryTimes: 6,
      retryInterval: 5000,
      retryLazy: 60000,
      whiteList: [],
      groupWhiteList: [],
    },
    stickers: {},
  },
});

export default config;
