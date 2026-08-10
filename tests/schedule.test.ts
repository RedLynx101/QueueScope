import { describe, expect, it } from "vitest";
import { createDefaultWatch } from "../src/core/defaults";
import { activeOccurrence, currentOrNextOccurrence, isOlderWatch, zonedDateTimeToEpoch } from "../src/core/schedule";

describe("schedules", () => {
  it("converts UTC date time deterministically", () => expect(zonedDateTimeToEpoch("2026-08-10", "09:30", "UTC")).toBe(Date.UTC(2026, 7, 10, 9, 30)));
  it("finds a current one-time window", () => { const now = Date.UTC(2026, 7, 10, 10); const watch = createDefaultWatch(now); watch.schedule.startAt = now - 1000; watch.schedule.stopAt = now + 1000; expect(activeOccurrence(watch, now)?.startAt).toBe(now - 1000); });
  it("marks an elapsed one-time watch older", () => { const now = Date.UTC(2026, 7, 10, 10); const watch = createDefaultWatch(now); watch.schedule.startAt = now - 2000; watch.schedule.stopAt = now - 1000; expect(isOlderWatch(watch, now)).toBe(true); });
  it("gives passive watches an open-ended occurrence", () => { const now = Date.UTC(2026, 7, 10); const watch = createDefaultWatch(now); watch.profile = "passive"; expect(currentOrNextOccurrence(watch, now)?.startAt).toBe(now); });
  it("supports recurring weekdays", () => { const now = Date.UTC(2026, 7, 10, 8); const watch = createDefaultWatch(now); watch.schedule = { type: "weekdays", enabled: true, timezone: "UTC", weekdays: [], startTime: "09:00", expectedTime: "09:15", stopTime: "10:00" }; expect(currentOrNextOccurrence(watch, now)?.startAt).toBe(Date.UTC(2026, 7, 10, 9)); });
  it("supports windows crossing midnight", () => { const now = Date.UTC(2026, 7, 10, 23); const watch = createDefaultWatch(now); watch.schedule = { type: "daily", enabled: true, timezone: "UTC", weekdays: [], startTime: "23:30", stopTime: "00:30" }; const result = currentOrNextOccurrence(watch, now)!; expect(result.stopAt - result.startAt).toBe(3_600_000); });
});
