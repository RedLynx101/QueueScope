import { describe, expect, it } from "vitest";
import { createDefaultWatch } from "../src/core/defaults";
import { canonicalizeUrl, normalizeSettings, normalizeWatch } from "../src/core/validation";

describe("validation", () => {
  it("removes common tracking parameters and fragments", () => expect(canonicalizeUrl("https://example.test/item?utm_source=x&id=4#buy")).toBe("https://example.test/item?id=4"));
  it("rejects non-web protocols", () => expect(() => canonicalizeUrl("file:///secret")).toThrow());
  it("bounds cadences and jitter", () => { const watch = createDefaultWatch(); watch.cadenceSeconds = 1; watch.activeCadenceSeconds = 99999; watch.jitterPercent = 90; const value = normalizeWatch(watch); expect(value.cadenceSeconds).toBe(5); expect(value.activeCadenceSeconds).toBe(3600); expect(value.jitterPercent).toBe(50); });
  it("requires stop after start", () => { const watch = createDefaultWatch(); watch.schedule.stopAt = watch.schedule.startAt; expect(() => normalizeWatch(watch)).toThrow("Stop time"); });
  it("bounds settings", () => { const value = normalizeSettings({ retentionDays: 999, queueEtaAlertMinutes: 0 }); expect(value.retentionDays).toBe(365); expect(value.queueEtaAlertMinutes).toBe(1); });
});
