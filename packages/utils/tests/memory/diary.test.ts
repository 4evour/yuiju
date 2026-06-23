import { describe, expect, it } from "vitest";
import { resolveDiarySummaryPeriodRange } from "../../src/memory/diary";
import { buildDiarySummarySystemPrompt } from "../../src/prompt";

function toDateText(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

describe("resolveDiarySummaryPeriodRange", () => {
  it("会解析自然日范围", () => {
    const range = resolveDiarySummaryPeriodRange({
      period: "day",
      date: new Date("2026-06-24T12:00:00+08:00"),
    });

    expect(toDateText(range.periodStartDate)).toBe("2026-06-24");
    expect(toDateText(range.periodEndDate)).toBe("2026-06-25");
  });

  it("会按周一到下周一解析自然周范围", () => {
    const range = resolveDiarySummaryPeriodRange({
      period: "week",
      date: new Date("2026-06-24T12:00:00+08:00"),
    });

    expect(toDateText(range.periodStartDate)).toBe("2026-06-22");
    expect(toDateText(range.periodEndDate)).toBe("2026-06-29");
  });

  it("会解析自然月范围", () => {
    const range = resolveDiarySummaryPeriodRange({
      period: "month",
      date: new Date("2026-02-14T12:00:00+08:00"),
    });

    expect(toDateText(range.periodStartDate)).toBe("2026-02-01");
    expect(toDateText(range.periodEndDate)).toBe("2026-03-01");
  });

  it("会解析自然年范围", () => {
    const range = resolveDiarySummaryPeriodRange({
      period: "year",
      date: new Date("2026-06-14T12:00:00+08:00"),
    });

    expect(toDateText(range.periodStartDate)).toBe("2026-01-01");
    expect(toDateText(range.periodEndDate)).toBe("2027-01-01");
  });
});

describe("buildDiarySummarySystemPrompt", () => {
  it("会按目标周期说明下级总结素材来源", () => {
    const prompt = buildDiarySummarySystemPrompt({
      subject: "ゆいじゅ",
      period: "month",
      sourcePeriod: "week",
      periodStartDate: new Date("2026-06-01T00:00:00+08:00"),
      periodEndDate: new Date("2026-07-01T00:00:00+08:00"),
    });

    expect(prompt).toContain("请根据提供的每周总结");
    expect(prompt).not.toContain("请根据提供的每日 Diary");
  });
});
