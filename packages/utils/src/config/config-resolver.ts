import { mergeWith } from "lodash-es";
import { type YuijuConfig, yuijuConfigSchema } from "./config-schema";
import { defaultYuijuConfig } from "./default-config";

function resolveEnvironmentReferences(
  value: unknown,
  environment: NodeJS.ProcessEnv,
  path: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      resolveEnvironmentReferences(item, environment, `${path}[${index}]`),
    );
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const objectValue = value as Record<string, unknown>;
  if ("$env" in objectValue) {
    if (Object.keys(objectValue).length !== 1 || typeof objectValue.$env !== "string") {
      throw new Error(`${path} 的环境变量引用必须是仅包含字符串 $env 字段的对象`);
    }

    const environmentValue = environment[objectValue.$env];
    if (!environmentValue) {
      throw new Error(`${path} 引用的环境变量 ${objectValue.$env} 未配置`);
    }

    return environmentValue;
  }

  return Object.fromEntries(
    Object.entries(objectValue).map(([key, item]) => [
      key,
      resolveEnvironmentReferences(item, environment, `${path}.${key}`),
    ]),
  );
}

/**
 * 将用户 JSON 配置解析为完整项目配置。
 *
 * 用户数组会整体替换默认数组；普通对象递归合并。公开部署跳过完整 Schema 校验，
 * 缺失能力由实际使用该能力的运行时入口报错。
 */
export function resolveYuijuConfig(
  userConfig: unknown,
  environment: NodeJS.ProcessEnv,
): YuijuConfig {
  const mergedConfig = mergeYuijuConfig(userConfig, environment);
  if ((mergedConfig as { app: { publicDeployment: unknown } }).app.publicDeployment === true) {
    return mergedConfig as YuijuConfig;
  }

  return yuijuConfigSchema.parse(mergedConfig);
}

function mergeYuijuConfig(userConfig: unknown, environment: NodeJS.ProcessEnv): unknown {
  const resolvedUserConfig = resolveEnvironmentReferences(userConfig, environment, "配置");
  return mergeWith({}, defaultYuijuConfig, resolvedUserConfig, (_defaultValue, userValue) =>
    Array.isArray(userValue) ? userValue : undefined,
  );
}
