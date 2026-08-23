import type {
  PromptCustomizationKey,
  PromptCustomizationOverrideMap,
} from "../../types/prompt-customization";
import { getPromptCustomizationModel } from "../schema/prompt-customization.schema";

export async function getPromptCustomizationOverrides(
  keys: readonly PromptCustomizationKey[],
): Promise<PromptCustomizationOverrideMap> {
  const model = await getPromptCustomizationModel();
  const documents = await model
    .find({ key: { $in: keys } })
    .lean()
    .exec();

  return Object.fromEntries(
    documents.map((document) => [
      document.key,
      {
        content: document.content,
        updatedAt: document.updatedAt,
      },
    ]),
  );
}

export async function savePromptCustomization(
  key: PromptCustomizationKey,
  content: string,
): Promise<Date> {
  const model = await getPromptCustomizationModel();
  const updatedAt = new Date();
  const document = await model
    .findOneAndUpdate(
      { key },
      {
        $set: {
          content,
          updatedAt,
        },
        $setOnInsert: { key },
      },
      {
        new: true,
        upsert: true,
      },
    )
    .exec();

  if (!document) {
    throw new Error(`保存提示词配置失败：${key}`);
  }

  return document.updatedAt;
}

export async function deletePromptCustomization(key: PromptCustomizationKey): Promise<void> {
  const model = await getPromptCustomizationModel();
  await model.deleteOne({ key }).exec();
}
