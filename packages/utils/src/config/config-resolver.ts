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
 * 用户数组会整体替换默认数组；普通对象递归合并。
 */
export function resolveYuijuConfig(
  userConfig: unknown,
  environment: NodeJS.ProcessEnv,
): YuijuConfig {
  const resolvedUserConfig = resolveEnvironmentReferences(userConfig, environment, "配置");
  const mergedConfig = mergeWith(
    {},
    defaultYuijuConfig,
    resolvedUserConfig,
    (_defaultValue, userValue) => (Array.isArray(userValue) ? userValue : undefined),
  );

  return yuijuConfigSchema.parse(mergedConfig);
}
