import { PASSIVE_STOP_AT } from "./defaults";
import type { ScheduleType, Watch, Weekday } from "./types";

export interface RunWindow {
  occurrenceKey: string;
  startAt: number;
  stopAt: number;
  expectedAt?: number;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
export const WEEKENDS: Weekday[] = [0, 6];

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  formatterCache.set(timezone, value);
  return value;
}

function zonedParts(timestamp: number, timezone: string) {
  const values: Record<string, number> = {};
  for (const part of formatter(timezone).formatToParts(new Date(timestamp))) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values;
}

export function isTime(value?: string): value is string {
  return Boolean(value && timePattern.test(value));
}

export function isDate(value?: string): value is string {
  return Boolean(value && datePattern.test(value));
}

export function isTimezone(value: string): boolean {
  try {
    formatter(value);
    return true;
  } catch {
    return false;
  }
}

export function zonedDateTimeToEpoch(date: string, time: string, timezone: string): number {
  if (!isDate(date) || !isTime(time) || !isTimezone(timezone)) {
    throw new Error("Invalid zoned date and time.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(guess, timezone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const difference = target - represented;
    guess += difference;
    if (Math.abs(difference) < 1000) break;
  }
  return guess;
}

function dateString(timestamp: number, timezone: string): string {
  const parts = zonedParts(timestamp, timezone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function daysForType(type: ScheduleType, custom: Weekday[]): Weekday[] {
  if (type === "daily") return ALL_DAYS;
  if (type === "weekdays") return WEEKDAYS;
  if (type === "weekends") return WEEKENDS;
  if (type === "custom") return [...new Set(custom)].sort() as Weekday[];
  return [];
}

function occurrenceForDate(watch: Watch, date: string): RunWindow | undefined {
  const schedule = watch.schedule;
  if (schedule.type === "once") {
    if (schedule.startAt === undefined || schedule.stopAt === undefined) return undefined;
    return { occurrenceKey: `${watch.id}:${schedule.startAt}`, startAt: schedule.startAt, stopAt: schedule.stopAt, expectedAt: schedule.expectedAt };
  }
  if (!isDate(date) || !isTime(schedule.startTime) || !isTime(schedule.stopTime) || !isTimezone(schedule.timezone)) return undefined;
  if (!daysForType(schedule.type, schedule.weekdays).includes(new Date(`${date}T00:00:00Z`).getUTCDay() as Weekday)) return undefined;
  if (schedule.startsOn && date < schedule.startsOn) return undefined;
  if (schedule.endsOn && date > schedule.endsOn) return undefined;
  const startMinutes = Number(schedule.startTime.slice(0, 2)) * 60 + Number(schedule.startTime.slice(3));
  const stopMinutes = Number(schedule.stopTime.slice(0, 2)) * 60 + Number(schedule.stopTime.slice(3));
  const crossesMidnight = stopMinutes <= startMinutes;
  const stopDate = crossesMidnight ? addDays(date, 1) : date;
  const startAt = zonedDateTimeToEpoch(date, schedule.startTime, schedule.timezone);
  const stopAt = zonedDateTimeToEpoch(stopDate, schedule.stopTime, schedule.timezone);
  let expectedAt: number | undefined;
  if (isTime(schedule.expectedTime)) {
    const expectedMinutes = Number(schedule.expectedTime.slice(0, 2)) * 60 + Number(schedule.expectedTime.slice(3));
    expectedAt = zonedDateTimeToEpoch(crossesMidnight && expectedMinutes < startMinutes ? stopDate : date, schedule.expectedTime, schedule.timezone);
  }
  return { occurrenceKey: `${watch.id}:${startAt}`, startAt, stopAt, expectedAt };
}

export function currentOrNextOccurrence(watch: Watch, now = Date.now()): RunWindow | undefined {
  if (watch.profile === "passive") {
    return { occurrenceKey: `${watch.id}:passive`, startAt: now, stopAt: PASSIVE_STOP_AT };
  }
  if (watch.schedule.type === "once") {
    const value = occurrenceForDate(watch, "");
    return value && value.stopAt > now ? value : undefined;
  }
  const today = dateString(now, watch.schedule.timezone);
  const candidates: RunWindow[] = [];
  for (let offset = -1; offset <= 14; offset += 1) {
    const value = occurrenceForDate(watch, addDays(today, offset));
    if (value && value.stopAt > now) candidates.push(value);
  }
  return candidates.sort((a, b) => a.startAt - b.startAt)[0];
}

export function activeOccurrence(watch: Watch, now = Date.now()): RunWindow | undefined {
  const value = currentOrNextOccurrence(watch, now);
  return value && value.startAt <= now && now < value.stopAt ? value : undefined;
}

export function isOlderWatch(watch: Watch, now = Date.now()): boolean {
  return watch.profile === "scheduled" && currentOrNextOccurrence(watch, now) === undefined;
}

export function describeSchedule(watch: Watch, now = Date.now()): string {
  if (watch.profile === "passive") return `${watch.schedule.enabled ? "Armed" : "Paused"} · every ${watch.cadenceSeconds < 60 ? `${watch.cadenceSeconds}s` : `${Math.round(watch.cadenceSeconds / 60)}m`} · until stopped`;
  const value = currentOrNextOccurrence(watch, now);
  if (!value) return "No future occurrence";
  return new Intl.DateTimeFormat("en-US", { timeZone: watch.schedule.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value.startAt));
}
