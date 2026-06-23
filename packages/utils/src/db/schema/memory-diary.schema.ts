import mongoose, { type Document, Schema } from "mongoose";
import type { MemoryDiaryPeriod } from "../../memory/diary";
import { getMongoConnection, type MongoReadSource } from "../connect";

/**
 * MongoDB 中的 Diary 条目。
 *
 * 说明：
 * - period 表示 day/week/month/year，diaryDate 统一归一化为周期开始日；
 * - periodEndDate 是排他结束时间，用于查询跨自然月/年的阶段总结素材；
 * - text 保留完整日记正文，不额外拆分标题、摘要等结构；
 * - generatedAt / updatedAt 手动维护，避免引入与业务无关的 createdAt。
 */
export interface IMemoryDiary extends Document {
  subject: string;
  period: MemoryDiaryPeriod;
  diaryDate: Date;
  periodEndDate: Date;
  text: string;
  generatedAt: Date;
  updatedAt: Date;
  isDev: boolean;
}

export const MemoryDiarySchema = new Schema<IMemoryDiary>(
  {
    subject: { type: String, required: true, index: true },
    period: { type: String, required: true, enum: ["day", "week", "month", "year"], index: true },
    diaryDate: { type: Date, required: true, index: true },
    periodEndDate: { type: Date, required: true },
    text: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    isDev: { type: Boolean, required: true, default: false, index: true },
  },
  {
    collection: "memory_diary",
  },
);

MemoryDiarySchema.index({ subject: 1, period: 1, diaryDate: 1, isDev: 1 }, { unique: true });

export async function getMemoryDiaryModel(
  source: MongoReadSource = "primary",
): Promise<mongoose.Model<IMemoryDiary>> {
  const connection = await getMongoConnection(source);
  return (
    (connection.models.MemoryDiary as mongoose.Model<IMemoryDiary> | undefined) ??
    connection.model<IMemoryDiary>("MemoryDiary", MemoryDiarySchema)
  );
}
