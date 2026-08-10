import { describe, expect, it } from "vitest";
import { createDefaultWatch } from "../src/core/defaults";
import { applyObservation, cadenceFor, createRun, refreshDecision } from "../src/core/state-machine";

function run(now = 100_000) { const watch = createDefaultWatch(now); watch.schedule.startAt = now; watch.schedule.stopAt = now + 60_000; watch.schedule.expectedAt = now + 30_000; return createRun(watch, { occurrenceKey: "test", startAt: now, stopAt: now + 60_000, expectedAt: now + 30_000 }, now); }
describe("run safety state machine", () => {
  it("uses fast cadence around expected time", () => expect(cadenceFor(run(), 130_000)).toBe(15));
  it("permits guarded refresh before attention", () => expect(refreshDecision(run(), 100_000).action).toBe("refresh"));
  it("locks irreversibly on queue evidence", () => { const queued = applyObservation(run(), { observedAt: 101_000, url: "https://example.test", title: "", classification: "queue", confidence: 1, evidence: ["queue"] }); const later = applyObservation(queued, { observedAt: 102_000, url: "https://example.test", title: "", classification: "product", confidence: .5, evidence: ["page"] }); expect(later.queueLocked).toBe(true); expect(refreshDecision(later, 103_000).action).toBe("locked"); });
  it("does not admit without prior queue evidence", () => expect(applyObservation(run(), { observedAt: 101_000, url: "https://example.test", title: "", classification: "admitted", confidence: 1, evidence: ["ready"] }).state).not.toBe("ADMITTED"));
  it("admits after a queue lock", () => { const queued = applyObservation(run(), { observedAt: 101_000, url: "https://example.test", title: "", classification: "queue", confidence: 1, evidence: ["queue"] }); expect(applyObservation(queued, { observedAt: 102_000, url: "https://example.test", title: "", classification: "admitted", confidence: 1, evidence: ["ready"] }).state).toBe("ADMITTED"); });
  it("observe-only runs never request refresh", () => { const value = run(); value.mode = "observe-only"; expect(refreshDecision(value, 100_000).action).toBe("observe"); });
});
