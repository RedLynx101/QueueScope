import type { Observation, WatchRules } from "./types";

const MAX_TEXT = 100_000;
const MAX_PATTERN = 200;

export function normalizeTextRules(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean))]
    .slice(0, 20)
    .map((value) => value.slice(0, 120));
}

export function isSafeSelector(value?: string): boolean {
  if (!value) return true;
  if (value.length > MAX_PATTERN || /[\r\n{}]/.test(value)) return false;
  try {
    if (typeof document !== "undefined") document.createDocumentFragment().querySelector(value);
    return true;
  } catch {
    return false;
  }
}

export function compileSafePattern(value?: string): RegExp | undefined {
  if (!value || value.length > MAX_PATTERN || /\([^)]*[+*][^)]*\)[+*{]/.test(value)) return undefined;
  try {
    return new RegExp(value, "i");
  } catch {
    return undefined;
  }
}

function firstTextMatch(text: string, values: string[]): string | undefined {
  return values.find((value) => text.includes(value));
}

export function parseDuration(value: string): number | undefined {
  const clock = value.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  const minutes = value.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (minutes) return Number(minutes[1]) * 60;
  const seconds = value.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/i);
  return seconds ? Number(seconds[1]) : undefined;
}

export interface RuleInput {
  url: string;
  title: string;
  text: string;
  availableSelectorMatched: boolean;
  priorQueueLock: boolean;
  observedAt?: number;
}

export function classifyWithRules(rules: WatchRules, input: RuleInput): Observation {
  const observedAt = input.observedAt ?? Date.now();
  const text = input.text.slice(0, MAX_TEXT).toLowerCase();
  const challenge = firstTextMatch(text, rules.challengeText);
  const queue = firstTextMatch(text, rules.queueText);
  const admitted = input.priorQueueLock ? firstTextMatch(text, rules.admittedText) : undefined;
  const unavailable = firstTextMatch(text, rules.unavailableText);
  let classification: Observation["classification"] = "unknown";
  let evidence = "No configured signal matched.";
  let confidence = 0.25;
  if (challenge) {
    classification = "challenge";
    evidence = `Challenge text matched: ${challenge}`;
    confidence = 0.98;
  } else if (queue) {
    classification = "queue";
    evidence = `Queue text matched: ${queue}`;
    confidence = 0.98;
  } else if (admitted) {
    classification = "admitted";
    evidence = `Post-queue admission text matched: ${admitted}`;
    confidence = 0.97;
  } else if (input.availableSelectorMatched) {
    classification = "available";
    evidence = `Availability selector matched: ${rules.availableSelector}`;
    confidence = 0.94;
  } else if (unavailable) {
    classification = "unavailable";
    evidence = `Unavailable text matched: ${unavailable}`;
    confidence = 0.9;
  } else if (text.length > 0) {
    classification = "product";
    evidence = "Page loaded; no attention signal matched.";
    confidence = 0.55;
  }

  const observation: Observation = { observedAt, url: input.url, title: input.title.slice(0, 180), classification, confidence, evidence: [evidence.slice(0, 240)] };
  if (classification === "queue") {
    const positionMatch = compileSafePattern(rules.positionPattern)?.exec(text);
    const position = positionMatch?.[1] ? Number(positionMatch[1].replaceAll(",", "")) : undefined;
    if (Number.isFinite(position) && position !== undefined && position >= 0 && position <= 1_000_000_000) observation.position = position;
    const etaMatch = compileSafePattern(rules.etaPattern)?.exec(text);
    const duration = etaMatch?.[1] ? parseDuration(etaMatch[1]) : undefined;
    if (duration !== undefined && duration >= 0 && duration <= 7 * 24 * 3600) {
      observation.providerEtaAt = observedAt + duration * 1000;
      observation.providerEtaLabel = etaMatch?.[1].slice(0, 80);
    }
  }
  return observation;
}
