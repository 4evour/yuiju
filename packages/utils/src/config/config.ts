import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import userConfig from "../../../../yuiju.config.json";
import { resolveYuijuConfig, resolveYuijuConfigWithoutSchemaValidation } from "./config-resolver";
import type { YuijuConfig } from "./config-schema";

let cachedConfig: Readonly<YuijuConfig> | null = null;
let cachedProjectRoot: string | null = null;

/**
 * 深度冻结配置对象，避免运行时被意外篡改。
 *
 * 说明：
 * - 配置是全局只读输入，不应该被业务代码在运行中修改；
 * - 这里递归冻结对象与数组，确保各子包拿到的是稳定快照。
 */
function deepFreezeConfig<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Object.isFrozen(value)) {
    return value;
  }

  for (const key of Reflect.ownKeys(value)) {
    const nestedValue = (value as Record<PropertyKey, unknown>)[key];
    if (nestedValue && typeof nestedValue === "object") {
      deepFreezeConfig(nestedValue);
    }
  }

  return Object.freeze(value);
}

/**
 * 读取项目根目录的统一配置。
 *
 * 说明：
 * - 用户配置源固定为项目根目录的 yuiju.config.json；
 * - 配置处理模块负责解析环境变量引用并合并默认值；
 * - 非公开部署校验完整结构，公开部署把缺失能力的错误推迟到实际运行入口；
 * - 读取结果会被缓存并深度冻结，供 monorepo 各子包复用。
 */
export function getYuijuConfig(): Readonly<YuijuConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = deepFreezeConfig(
    userConfig.app.publicDeployment
      ? resolveYuijuConfigWithoutSchemaValidation(userConfig, process.env)
      : resolveYuijuConfig(userConfig, process.env),
  );
  return cachedConfig;
}

/**
 * 获取项目根目录绝对路径。
 *
 * 说明：
 * - 配置中的静态资源路径以项目根目录为基准；
 * - 这里基于 utils 包内文件位置推导根目录，避免依赖进程启动 cwd。
 */
export function getYuijuProjectRoot(): string {
  if (cachedProjectRoot) {
    return cachedProjectRoot;
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  cachedProjectRoot = resolve(currentDir, "../../../../");
  return cachedProjectRoot;
}
