import mongoose, { type Document, Schema } from "mongoose";
import type { MemoryDiarySummaryPeriod } from "../../memory/diary";
import { getMongoConnection, type MongoReadSource } from "../connect";

export interface IMemoryDiarySummary extends Document {
  subject: string;
  period: MemoryDiarySummaryPeriod;
  periodStartDate: Date;
  periodEndDate: Date;
  text: string;
  generatedAt: Date;
  updatedAt: Date;
  isDev: boolean;
}

export const MemoryDiarySummarySchema = new Schema<IMemoryDiarySummary>(
  {
    subject: { type: String, required: true, index: true },
    period: { type: String, required: true, enum: ["week", "month", "year"], index: true },
    periodStartDate: { type: Date, required: true, index: true },
    periodEndDate: { type: Date, required: true },
    text: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    isDev: { type: Boolean, required: true, default: false, index: true },
  },
  {
    collection: "memory_diary_summary",
  },
);

MemoryDiarySummarySchema.index(
  { subject: 1, period: 1, periodStartDate: 1, isDev: 1 },
  { unique: true },
);

export async function getMemoryDiarySummaryModel(
  source: MongoReadSource = "primary",
): Promise<mongoose.Model<IMemoryDiarySummary>> {
  const connection = await getMongoConnection(source);
  return (
    (connection.models.MemoryDiarySummary as mongoose.Model<IMemoryDiarySummary> | undefined) ??
    connection.model<IMemoryDiarySummary>("MemoryDiarySummary", MemoryDiarySummarySchema)
  );
}
