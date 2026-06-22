import { describe, expect, it } from "vitest";
import { resolveDiarySummaryPeriodRange } from "../../src/memory/diary";

function toDateText(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

describe("resolveDiarySummaryPeriodRange", () => {
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
