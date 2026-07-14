import { describe, expect, it } from "vitest";
import { evaluateDemoPolicyAutoReadiness } from "../apps/dashboard/src/autonomy-rollout.js";

describe("autonomy rollout evidence gating", () => {
  it("accepts fresh completed demo evidence even when today's live day is still red", () => {
    const result = evaluateDemoPolicyAutoReadiness(
      {
        requiredDays: 7,
        qualifiedDays: 8,
        streakDays: 1,
        today: {
          day: "2026-03-17",
          pass: false
        },
        days: [
          { day: "2026-03-17", pass: false, source: "live" },
          { day: "2026-03-16", pass: true, source: "soak_report" },
          { day: "2026-03-15", pass: true, source: "soak_report" },
          { day: "2026-03-14", pass: true, source: "soak_report" },
          { day: "2026-03-13", pass: true, source: "soak_report" },
          { day: "2026-03-12", pass: true, source: "soak_report" },
          { day: "2026-03-11", pass: true, source: "soak_report" },
          { day: "2026-03-10", pass: true, source: "soak_report" }
        ]
      },
      "2026-03-17T12:00:00.000Z"
    );

    expect(result.ok).toBe(true);
    expect(result.qualifiedDays).toBe(7);
    expect(result.fresh).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects readiness when only today's live sample passes and no completed evidence exists", () => {
    const result = evaluateDemoPolicyAutoReadiness(
      {
        requiredDays: 7,
        qualifiedDays: 1,
        streakDays: 1,
        today: {
          day: "2026-03-17",
          pass: true
        },
        days: [{ day: "2026-03-17", pass: true, source: "live" }]
      },
      "2026-03-17T12:00:00.000Z"
    );

    expect(result.ok).toBe(false);
    expect(result.qualifiedDays).toBe(0);
    expect(result.reasons.some((item) => item.includes("qualifiedDays=0/7"))).toBe(true);
    expect(result.reasons.some((item) => item.includes("no completed passing evidence day available"))).toBe(true);
  });

  it("rejects stale completed evidence older than seven days", () => {
    const result = evaluateDemoPolicyAutoReadiness(
      {
        requiredDays: 7,
        qualifiedDays: 7,
        streakDays: 7,
        today: {
          day: "2026-03-17",
          pass: false
        },
        days: [
          { day: "2026-03-09", pass: true, source: "soak_report" },
          { day: "2026-03-08", pass: true, source: "soak_report" },
          { day: "2026-03-07", pass: true, source: "soak_report" },
          { day: "2026-03-06", pass: true, source: "soak_report" },
          { day: "2026-03-05", pass: true, source: "soak_report" },
          { day: "2026-03-04", pass: true, source: "soak_report" },
          { day: "2026-03-03", pass: true, source: "soak_report" }
        ]
      },
      "2026-03-17T12:00:00.000Z"
    );

    expect(result.ok).toBe(false);
    expect(result.qualifiedDays).toBe(7);
    expect(result.fresh).toBe(false);
    expect(result.latestEvidenceAgeDays).toBe(8);
    expect(result.reasons.some((item) => item.includes("latestPassingDay=2026-03-09 is stale"))).toBe(true);
  });

  it("allows demo runtime freshness from today's green live evidence when historical qualified days already exist", () => {
    const result = evaluateDemoPolicyAutoReadiness(
      {
        requiredDays: 7,
        qualifiedDays: 7,
        streakDays: 1,
        today: {
          day: "2026-03-25",
          pass: true
        },
        days: [
          { day: "2026-03-25", pass: true, source: "live" },
          { day: "2026-03-17", pass: true, source: "soak_report" },
          { day: "2026-03-16", pass: true, source: "soak_report" },
          { day: "2026-03-15", pass: true, source: "soak_report" },
          { day: "2026-03-14", pass: true, source: "soak_report" },
          { day: "2026-03-13", pass: true, source: "soak_report" },
          { day: "2026-03-12", pass: true, source: "soak_report" },
          { day: "2026-03-11", pass: true, source: "soak_report" }
        ]
      },
      "2026-03-25T12:00:00.000Z",
      { allowTodayLivePassForFreshness: true }
    );

    expect(result.ok).toBe(true);
    expect(result.latestPassingEvidenceDay).toBe("2026-03-25");
    expect(result.fresh).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});
