import type { AppSettings, AppSnapshot, Watch, WatchRules } from "./types";

export const MAX_EVENT_HISTORY = 200;
export const PASSIVE_STOP_AT = Date.UTC(9999, 11, 31, 23, 59, 59);

export const DEFAULT_RULES: WatchRules = {
  queueText: ["you are now in the waiting room"],
  admittedText: ["access granted. your session is ready"],
  challengeText: ["please verify you are human"],
  unavailableText: ["not available yet"],
  availableSelector: "[data-queuescope-available='true']",
  positionPattern: "position\\s+(\\d+)",
  etaPattern: "estimated wait\\s+(\\d{2}:\\d{2}:\\d{2})"
};

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  tone: "signal",
  focusOnAdmission: true,
  retentionDays: 30,
  motion: "full",
  density: "comfortable",
  expandRunsByDefault: false,
  queueEtaAlertMinutes: 10
};

function timezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function createDefaultWatch(now = Date.now()): Watch {
  const startAt = now + 5 * 60_000;
  return {
    id: crypto.randomUUID(),
    name: "New page watch",
    url: "http://127.0.0.1:4175/harness/",
    profile: "scheduled",
    mode: "guarded-refresh",
    schedule: {
      type: "once",
      enabled: false,
      timezone: timezone(),
      weekdays: [],
      startAt,
      expectedAt: startAt + 5 * 60_000,
      stopAt: startAt + 60 * 60_000
    },
    cadenceSeconds: 60,
    activeCadenceSeconds: 15,
    fastWindowBeforeMinutes: 10,
    fastWindowAfterMinutes: 10,
    jitterPercent: 5,
    rules: structuredClone(DEFAULT_RULES),
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultSnapshot(): AppSnapshot {
  return {
    version: 1,
    watches: [],
    activeRuns: [],
    history: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}
