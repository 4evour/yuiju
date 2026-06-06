import type { InventoryItemMetadata } from "@yuiju/utils";

type FoodRecoverySnapshot = {
  stamina: number;
  satiety: number;
  mood: number;
};

type BuildFoodMetadataInput = {
  stamina?: number;
  satiety?: number;
  mood?: number;
  fallbackSatiety?: number;
};

/**
 * 构建写入背包的食物 metadata。
 *
 * 说明：
 * - 统一保留 stamina/satiety/mood 三类收益，避免购买动作遗漏字段；
 * - 对未显式提供 satiety 的食物，允许调用方给一个兜底值，兼容现有资源配置。
 */
export function buildFoodMetadata(input: BuildFoodMetadataInput): InventoryItemMetadata {
  const metadata: InventoryItemMetadata = {};

  if (typeof input.stamina === "number") {
    metadata.stamina = input.stamina;
  }

  if (typeof input.satiety === "number") {
    metadata.satiety = input.satiety;
  } else if (typeof input.fallbackSatiety === "number") {
    metadata.satiety = input.fallbackSatiety;
  }

  if (typeof input.mood === "number") {
    metadata.mood = input.mood;
  }

  return metadata;
}

/**
 * 解析单个食物的恢复值。
 *
 * 说明：
 * - stamina 默认按旧逻辑回退到 10，避免缺失配置时完全失去恢复能力；
 * - satiety 沿用“未配置时按体力恢复值推导”的兼容策略；
 * - mood 默认 0，只有显式配置或购买时写入的物品才恢复心情。
 */
export function resolveFoodRecoveryPerUnit(metadata?: InventoryItemMetadata): FoodRecoverySnapshot {
  const stamina = metadata?.stamina ?? 10;
  const satiety = metadata?.satiety ?? Math.max(1, Math.round(stamina * 2));
  const mood = metadata?.mood ?? 0;

  return {
    stamina,
    satiety,
    mood,
  };
}
