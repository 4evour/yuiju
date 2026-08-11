/**
 * 消息平台 WebSocket 重连配置。
 */
export interface YuijuMessageWebSocketReconnectConfig {
  retryTimes: number;
  retryInterval: number;
  retryLazy: number;
}

/**
 * message 进程暴露给内部调用方的 HTTP 服务配置。
 */
export interface YuijuMessageInternalApiConfig {
  host: string;
  port: number;
}

/**
 * OneBot 消息平台配置。
 */
export interface YuijuOneBotConfig extends YuijuMessageWebSocketReconnectConfig {
  protocol: "ws";
  selfId: string;
  endpoint: string;
  token: string;
  responseTimeout: number;
  whiteList: number[];
  ownerList: number[];
  groupWhiteList: number[];
}

/**
 * Lark / 飞书消息平台配置。
 */
export interface YuijuLarkConfig extends YuijuMessageWebSocketReconnectConfig {
  protocol: "ws";
  endpoint: string;
  appId: string;
  appSecret: string;
  whiteList: string[];
  ownerList: string[];
  groupWhiteList: string[];
}

/**
 * 单个表情包配置。
 *
 * 说明：
 * - `uri` 使用项目根目录相对路径，避免把机器相关的绝对路径写进配置；
 * - `description` 会暴露给 LLM，帮助模型理解使用语境。
 */
export interface YuijuStickerConfig {
  uri: string;
  description: string;
}

/**
 * 表情包映射表。
 *
 * 说明：
 * - key 是 LLM 输出 `[[sticker:key]]` 时使用的稳定标识；
 * - value 描述静态资源位置与使用语义。
 */
export type YuijuStickerMap = Record<string, YuijuStickerConfig>;

export interface YuijuMessageMemoryRetrievalCacheConfig {
  similarityThreshold: number;
}

/**
 * 消息服务相关配置。
 */
export interface YuijuMessageConfig {
  onebot: YuijuOneBotConfig;
  lark: YuijuLarkConfig;
  internalApi: YuijuMessageInternalApiConfig;
  proactive: {
    onebotGroupTargetId?: number;
    larkGroupTargetId?: string;
  };
  memoryRetrievalCache: YuijuMessageMemoryRetrievalCacheConfig;
  stickers: YuijuStickerMap;
}

/**
 * 数据存储相关配置。
 */
export interface YuijuDatabaseConfig {
  mongoUri: string;
  redisUrl: string;
  qdrant?: {
    baseUrl: string;
    apiKey?: string;
  };
  /**
   * 数据同步的 Mongo URI
   */
  syncMongoUri?: string;
  /**
   * 数据同步的 Redis URI
   */
  syncRedisUrl?: string;
}

/**
 * LLM 提供商相关配置。
 */
export interface YuijuLlmModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface YuijuEmbeddingModelConfig extends YuijuLlmModelConfig {
  dimensions: number;
}

export type YuijuLlmModelSourcesConfig = [YuijuLlmModelConfig, ...YuijuLlmModelConfig[]];

export interface YuijuLlmModelsConfig {
  chat: YuijuLlmModelSourcesConfig;
  strong: YuijuLlmModelSourcesConfig;
  flash: YuijuLlmModelSourcesConfig;
  vision: YuijuLlmModelSourcesConfig;
  embedding?: YuijuEmbeddingModelConfig;
}

/**
 * Hermes Agent 服务配置。
 */
export interface YuijuHermesAgentConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface YuijuLlmConfig {
  models: YuijuLlmModelsConfig;
  hermesAgent: YuijuHermesAgentConfig;
}

export interface YuijuLangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

export interface YuijuObservabilityConfig {
  langfuse: YuijuLangfuseConfig;
}

/**
 * 项目级运行配置。
 */
export interface YuijuAppConfig {
  publicDeployment: boolean;
  timezone: string;
  /**
   * 记忆目录绝对路径。
   *
   * 说明：
   * - 配置文件里必须直接填写绝对路径；
   * - 业务代码会在这个目录下继续拼接 `people`、`demo` 等子目录。
   */
  memoryDir: string;
}

/**
 * 项目根配置总结构。
 *
 * 说明：
 * - 所有原先散落在 .env / 子包 config.ts 中的运行配置统一收口到这里；
 * - NODE_ENV 仍保留为运行时环境变量，因此不纳入该配置结构。
 */
export interface YuijuConfig {
  app: YuijuAppConfig;
  database: YuijuDatabaseConfig;
  llm: YuijuLlmConfig;
  message: YuijuMessageConfig;
  /** 未配置时不启用 LLM trace。 */
  observability?: YuijuObservabilityConfig;
}

/**
 * 为根配置文件提供类型约束与自动补全。
 *
 * 说明：
 * - 该函数本身不做运行时转换，只负责让 yuiju.config.ts 获得清晰的类型提示；
 * - 单独拆到 schema 模块中，避免与配置读取器产生循环依赖。
 */
export function defineYuijuConfig(config: YuijuConfig): YuijuConfig {
  return config;
}
