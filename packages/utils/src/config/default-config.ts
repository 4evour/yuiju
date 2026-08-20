import type { YuijuConfig } from "./config-schema";

type YuijuDefaultConfig<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [Key in keyof T]?: YuijuDefaultConfig<T[Key]> }
    : T;

/**
 * 不依赖用户、机器或部署环境的项目默认配置。
 *
 * 数据库地址、模型来源、账号标识和凭证没有合理默认值，必须由用户配置提供。
 */
export const defaultYuijuConfig = {
  app: {
    publicDeployment: false,
    timezone: "Asia/Shanghai",
  },
  database: {},
  llm: {
    models: {},
  },
  world: {},
  message: {
    internalApi: {
      host: "127.0.0.1",
      port: 3020,
    },
    proactive: {},
    onebot: {
      protocol: "ws",
      retryTimes: 6,
      retryInterval: 5000,
      retryLazy: 60000,
      responseTimeout: 120000,
      whiteList: [],
      ownerList: [],
      groupWhiteList: [],
    },
    lark: {
      protocol: "ws",
      endpoint: "https://open.feishu.cn/open-apis",
      retryTimes: 6,
      retryInterval: 5000,
      retryLazy: 60000,
      whiteList: [],
      ownerList: [],
      groupWhiteList: [],
    },
    stickers: {},
  },
} satisfies YuijuDefaultConfig<YuijuConfig>;
