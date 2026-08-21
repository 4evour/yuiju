import { describe, expect, it } from "vitest";
import { resolveYuijuConfig } from "./config-resolver";

const modelSource = {
  baseUrl: "https://example.com/v1",
  apiKey: "api-key",
  model: "model",
};

function createUserConfig() {
  return {
    app: {
      memoryDir: "/tmp/yuiju/memory",
    },
    database: {
      mongoUri: "mongodb://localhost:27017/yuiju",
      redisUrl: "redis://localhost:6379",
    },
    llm: {
      models: {
        chat: [modelSource],
        strong: [modelSource],
        flash: [modelSource],
        vision: [modelSource],
      },
    },
    message: {
      onebot: {
        selfId: "10000",
        endpoint: "ws://localhost:3001",
        token: "onebot-token",
      },
      lark: {
        appId: "lark-app-id",
        appSecret: "lark-app-secret",
      },
    },
  };
}

describe("resolveYuijuConfig", () => {
  it("递归合并默认配置", () => {
    const config = resolveYuijuConfig(createUserConfig(), {});

    expect(config.app).toEqual({
      publicDeployment: false,
      timezone: "Asia/Shanghai",
      memoryDir: "/tmp/yuiju/memory",
    });
    expect(config.message.onebot).toMatchObject({
      protocol: "ws",
      selfId: "10000",
      retryTimes: 6,
      whiteList: [],
    });
    expect(config.message.lark.endpoint).toBe("https://open.feishu.cn/open-apis");
  });

  it("使用用户数组整体替换默认数组", () => {
    const baseConfig = createUserConfig();
    const userConfig = {
      ...baseConfig,
      message: {
        ...baseConfig.message,
        onebot: {
          ...baseConfig.message.onebot,
          whiteList: [10001, 10002],
        },
      },
    };

    const config = resolveYuijuConfig(userConfig, {});

    expect(config.message.onebot.whiteList).toEqual([10001, 10002]);
  });

  it("解析嵌套配置中的环境变量引用", () => {
    const baseConfig = createUserConfig();
    const userConfig = {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        syncMongoUri: { $env: "YUIJU_SYNC_MONGO_URI" },
      },
    };

    const config = resolveYuijuConfig(userConfig, {
      YUIJU_SYNC_MONGO_URI: "mongodb://sync.example.com:27017/yuiju",
    });

    expect(config.database.syncMongoUri).toBe("mongodb://sync.example.com:27017/yuiju");
  });

  it("环境变量不存在时直接报错", () => {
    const baseConfig = createUserConfig();
    const userConfig = {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        syncMongoUri: { $env: "YUIJU_SYNC_MONGO_URI" },
      },
    };

    expect(() => resolveYuijuConfig(userConfig, {})).toThrow(
      "配置.database.syncMongoUri 引用的环境变量 YUIJU_SYNC_MONGO_URI 未配置",
    );
  });

  it("拒绝带有额外字段的环境变量引用", () => {
    const baseConfig = createUserConfig();
    const userConfig = {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        syncMongoUri: {
          $env: "YUIJU_SYNC_MONGO_URI",
          fallback: "mongodb://fallback",
        },
      },
    };

    expect(() =>
      resolveYuijuConfig(userConfig, {
        YUIJU_SYNC_MONGO_URI: "mongodb://sync.example.com:27017/yuiju",
      }),
    ).toThrow("配置.database.syncMongoUri 的环境变量引用必须是仅包含字符串 $env 字段的对象");
  });

  it("忽略未知配置字段", () => {
    const userConfig = createUserConfig();
    Object.assign(userConfig.app, { unknown: true });

    const config = resolveYuijuConfig(userConfig, {});

    expect(config.app).not.toHaveProperty("unknown");
  });
});
