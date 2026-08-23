import mongoose, { type Document, Schema } from "mongoose";
import {
  type PromptCustomizationKey,
  promptCustomizationKeys,
} from "../../types/prompt-customization";
import { getMongoConnection } from "../connect";

export interface IPromptCustomization extends Document {
  key: PromptCustomizationKey;
  content: string;
  updatedAt: Date;
}

export const PromptCustomizationSchema = new Schema<IPromptCustomization>(
  {
    key: {
      type: String,
      required: true,
      enum: promptCustomizationKeys,
    },
    content: { type: String, required: true },
    updatedAt: { type: Date, required: true },
  },
  {
    collection: "prompt_customization",
  },
);

PromptCustomizationSchema.index({ key: 1 }, { unique: true });

export async function getPromptCustomizationModel(): Promise<mongoose.Model<IPromptCustomization>> {
  const connection = await getMongoConnection();
  return (
    (connection.models.PromptCustomization as mongoose.Model<IPromptCustomization> | undefined) ??
    connection.model<IPromptCustomization>("PromptCustomization", PromptCustomizationSchema)
  );
}
