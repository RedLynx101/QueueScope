import { DEFAULT_RULES, DEFAULT_SETTINGS, PASSIVE_STOP_AT } from "./defaults";
import { compileSafePattern, isSafeSelector, normalizeTextRules } from "./rules";
import { isTimezone } from "./schedule";
import type { AppSettings, RuntimeRequest, Watch, WatchRules } from "./types";

const trackingParams = [/^utm_/i, /^ref$/i, /^referrer$/i, /^source$/i, /^campaign$/i, /^fbclid$/i, /^gclid$/i];

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS pages can be watched.");
  url.username = "";
  url.password = "";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (trackingParams.some((pattern) => pattern.test(key))) url.searchParams.delete(key);
  }
  return url.toString();
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

export function normalizeRules(value: Partial<WatchRules> | undefined): WatchRules {
  const availableSelector = typeof value?.availableSelector === "string" ? value.availableSelector.trim().slice(0, 200) : DEFAULT_RULES.availableSelector;
  if (!isSafeSelector(availableSelector)) throw new Error("Availability selector is invalid or too complex.");
  const positionPattern = typeof value?.positionPattern === "string" ? value.positionPattern.trim().slice(0, 200) : DEFAULT_RULES.positionPattern;
  const etaPattern = typeof value?.etaPattern === "string" ? value.etaPattern.trim().slice(0, 200) : DEFAULT_RULES.etaPattern;
  if (positionPattern && !compileSafePattern(positionPattern)) throw new Error("Position pattern is invalid or potentially unsafe.");
  if (etaPattern && !compileSafePattern(etaPattern)) throw new Error("ETA pattern is invalid or potentially unsafe.");
  return {
    queueText: normalizeTextRules(value?.queueText ?? DEFAULT_RULES.queueText),
    admittedText: normalizeTextRules(value?.admittedText ?? DEFAULT_RULES.admittedText),
    challengeText: normalizeTextRules(value?.challengeText ?? DEFAULT_RULES.challengeText),
    unavailableText: normalizeTextRules(value?.unavailableText ?? DEFAULT_RULES.unavailableText),
    availableSelector: availableSelector || undefined,
    positionPattern: positionPattern || undefined,
    etaPattern: etaPattern || undefined
  };
}

export function normalizeWatch(input: Watch): Watch {
  const now = Date.now();
  const profile = input.profile === "passive" ? "passive" : "scheduled";
  const timezone = isTimezone(input.schedule?.timezone) ? input.schedule.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const watch: Watch = {
    id: typeof input.id === "string" && input.id ? input.id : crypto.randomUUID(),
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 100) : "Untitled watch",
    url: canonicalizeUrl(input.url),
    profile,
    mode: input.mode === "observe-only" ? "observe-only" : "guarded-refresh",
    schedule: {
      type: ["once", "daily", "weekdays", "weekends", "custom"].includes(input.schedule?.type) ? input.schedule.type : "once",
      enabled: input.schedule?.enabled === true,
      timezone,
      weekdays: Array.isArray(input.schedule?.weekdays) ? [...new Set(input.schedule.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))] as Watch["schedule"]["weekdays"] : [],
      startAt: profile === "passive" ? now : input.schedule?.startAt,
      stopAt: profile === "passive" ? PASSIVE_STOP_AT : input.schedule?.stopAt,
      expectedAt: input.schedule?.expectedAt,
      startTime: input.schedule?.startTime,
      stopTime: input.schedule?.stopTime,
      expectedTime: input.schedule?.expectedTime,
      startsOn: input.schedule?.startsOn,
      endsOn: input.schedule?.endsOn
    },
    cadenceSeconds: number(input.cadenceSeconds, 60, 5, 86_400),
    activeCadenceSeconds: number(input.activeCadenceSeconds, 15, 5, 3_600),
    fastWindowBeforeMinutes: number(input.fastWindowBeforeMinutes, 10, 0, 1_440),
    fastWindowAfterMinutes: number(input.fastWindowAfterMinutes, 10, 0, 1_440),
    jitterPercent: number(input.jitterPercent, 5, 0, 50),
    rules: normalizeRules(input.rules),
    createdAt: number(input.createdAt, now, 0, now),
    updatedAt: now
  };
  if (profile === "scheduled" && watch.schedule.type === "once") {
    if (!Number.isFinite(watch.schedule.startAt) || !Number.isFinite(watch.schedule.stopAt)) throw new Error("One-time watches need start and stop times.");
    if ((watch.schedule.stopAt ?? 0) <= (watch.schedule.startAt ?? 0)) throw new Error("Stop time must be after start time.");
    if (watch.schedule.expectedAt && (watch.schedule.expectedAt < (watch.schedule.startAt ?? 0) || watch.schedule.expectedAt > (watch.schedule.stopAt ?? 0))) throw new Error("Expected time must be inside the monitoring window.");
  }
  return watch;
}

export function normalizeSettings(input: Partial<AppSettings> | undefined): AppSettings {
  return {
    notificationsEnabled: input?.notificationsEnabled !== false,
    soundEnabled: input?.soundEnabled !== false,
    tone: ["signal", "soft", "urgent"].includes(input?.tone ?? "") ? input!.tone! : DEFAULT_SETTINGS.tone,
    focusOnAdmission: input?.focusOnAdmission !== false,
    retentionDays: number(input?.retentionDays, DEFAULT_SETTINGS.retentionDays, 1, 365),
    motion: input?.motion === "reduced" ? "reduced" : "full",
    density: input?.density === "compact" ? "compact" : "comfortable",
    expandRunsByDefault: input?.expandRunsByDefault === true,
    queueEtaAlertMinutes: number(input?.queueEtaAlertMinutes, DEFAULT_SETTINGS.queueEtaAlertMinutes, 1, 60)
  };
}

export function isRuntimeRequest(value: unknown): value is RuntimeRequest {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const request = value as Record<string, unknown>;
  if (["GET_SNAPSHOT", "LIST_ATTACHABLE_TABS", "OPEN_DASHBOARD", "OPEN_QUEUE_LAB", "GET_TAB_CONFIG"].includes(String(request.type))) return true;
  if (["DELETE_WATCH", "ARM_WATCH"].includes(String(request.type))) return typeof request.watchId === "string";
  if (["END_RUN", "FOCUS_RUN_TAB"].includes(String(request.type))) return typeof request.runId === "string";
  if (request.type === "ATTACH_TAB") return typeof request.tabId === "number" && request.tabId >= 0;
  if (request.type === "SAVE_WATCH") return Boolean(request.watch && typeof request.watch === "object");
  if (request.type === "SAVE_SETTINGS") return Boolean(request.settings && typeof request.settings === "object");
  if (request.type === "PREVIEW_TONE") return ["signal", "soft", "urgent"].includes(String(request.tone));
  if (request.type === "CONTENT_READY") return typeof request.url === "string";
  if (["OBSERVATION", "LAB_OBSERVATION"].includes(String(request.type))) return Boolean(request.observation && typeof request.observation === "object");
  return false;
}
