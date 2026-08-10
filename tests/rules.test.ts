import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../src/core/defaults";
import { classifyWithRules, compileSafePattern, isSafeSelector, normalizeTextRules, parseDuration } from "../src/core/rules";

describe("generic rule engine", () => {
  it("classifies queue and captures position plus absolute ETA", () => {
    const now = Date.UTC(2026, 7, 10, 12);
    const result = classifyWithRules(DEFAULT_RULES, { url: "https://example.test/item", title: "Example", text: "You are now in the waiting room. Position 428. Estimated wait 00:08:30", availableSelectorMatched: false, priorQueueLock: false, observedAt: now });
    expect(result.classification).toBe("queue"); expect(result.position).toBe(428); expect(result.providerEtaAt).toBe(now + 510_000);
  });
  it("refuses premature admission", () => expect(classifyWithRules(DEFAULT_RULES, { url: "https://example.test", title: "", text: "Access granted. Your session is ready", availableSelectorMatched: false, priorQueueLock: false }).classification).toBe("product"));
  it("accepts admission after prior queue evidence", () => expect(classifyWithRules(DEFAULT_RULES, { url: "https://example.test", title: "", text: "Access granted. Your session is ready", availableSelectorMatched: false, priorQueueLock: true }).classification).toBe("admitted"));
  it("prioritizes challenges", () => expect(classifyWithRules(DEFAULT_RULES, { url: "https://example.test", title: "", text: "Please verify you are human", availableSelectorMatched: false, priorQueueLock: false }).classification).toBe("challenge"));
  it("recognizes an enabled configured selector", () => expect(classifyWithRules(DEFAULT_RULES, { url: "https://example.test", title: "", text: "loaded", availableSelectorMatched: true, priorQueueLock: false }).classification).toBe("available"));
  it("parses clock and text durations", () => { expect(parseDuration("01:02:03")).toBe(3723); expect(parseDuration("17 minutes")).toBe(1020); expect(parseDuration("9 sec")).toBe(9); });
  it("normalizes bounded text rules", () => expect(normalizeTextRules([" Queue ", "queue", 1, ""])).toEqual(["queue"]));
  it("rejects suspicious regular expressions", () => expect(compileSafePattern("(a+)+$")).toBeUndefined());
  it("rejects multiline selectors", () => expect(isSafeSelector("button\n{}" )).toBe(false));
});
