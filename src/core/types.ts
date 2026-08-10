export type OperationMode = "guarded-refresh" | "observe-only";
export type WatchProfile = "scheduled" | "passive";
export type ScheduleType = "once" | "daily" | "weekdays" | "weekends" | "custom";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WatchSchedule {
  type: ScheduleType;
  enabled: boolean;
  timezone: string;
  weekdays: Weekday[];
  startAt?: number;
  stopAt?: number;
  expectedAt?: number;
  startTime?: string;
  stopTime?: string;
  expectedTime?: string;
  startsOn?: string;
  endsOn?: string;
}

export interface WatchRules {
  queueText: string[];
  admittedText: string[];
  challengeText: string[];
  unavailableText: string[];
  availableSelector?: string;
  positionPattern?: string;
  etaPattern?: string;
}

export interface Watch {
  id: string;
  name: string;
  url: string;
  profile: WatchProfile;
  mode: OperationMode;
  schedule: WatchSchedule;
  cadenceSeconds: number;
  activeCadenceSeconds: number;
  fastWindowBeforeMinutes: number;
  fastWindowAfterMinutes: number;
  jitterPercent: number;
  rules: WatchRules;
  createdAt: number;
  updatedAt: number;
}

export type PageClassification =
  | "product"
  | "available"
  | "unavailable"
  | "queue"
  | "challenge"
  | "admitted"
  | "unknown";

export interface Observation {
  observedAt: number;
  url: string;
  title: string;
  classification: PageClassification;
  confidence: number;
  evidence: string[];
  position?: number;
  providerEtaAt?: number;
  providerEtaLabel?: string;
}

export type RunState =
  | "ARMED"
  | "ACTIVE_CHECK"
  | "WAITING"
  | "ATTENTION"
  | "ADMITTED"
  | "COMPLETE"
  | "EXPIRED"
  | "FAILED";

export interface RunEvent {
  id: string;
  at: number;
  type: "armed" | "started" | "check" | "observation" | "queue-lock" | "attention" | "admitted" | "ended" | "error";
  label: string;
  detail?: string;
}

export interface Run {
  id: string;
  watchId?: string;
  watchName: string;
  occurrenceKey: string;
  url: string;
  profile: WatchProfile;
  mode: OperationMode;
  state: RunState;
  stateChangedAt: number;
  createdAt: number;
  startAt: number;
  stopAt: number;
  expectedAt?: number;
  nextCheckAt?: number;
  checkCount: number;
  cadenceSeconds: number;
  activeCadenceSeconds: number;
  fastWindowBeforeMinutes: number;
  fastWindowAfterMinutes: number;
  jitterPercent: number;
  queueLocked: boolean;
  queueLockReason?: string;
  tabId?: number;
  attached: boolean;
  rules: WatchRules;
  lastObservation?: Observation;
  events: RunEvent[];
  endedAt?: number;
  outcome?: "admitted" | "completed" | "missed" | "abandoned" | "unknown";
  error?: string;
}

export type ToneId = "signal" | "soft" | "urgent";

export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  tone: ToneId;
  focusOnAdmission: boolean;
  retentionDays: number;
  motion: "full" | "reduced";
  density: "comfortable" | "compact";
  expandRunsByDefault: boolean;
  queueEtaAlertMinutes: number;
}

export interface AppSnapshot {
  version: 1;
  watches: Watch[];
  activeRuns: Run[];
  history: Run[];
  settings: AppSettings;
}

export interface AttachableTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
  attached: boolean;
}

export type RuntimeRequest =
  | { type: "GET_SNAPSHOT" }
  | { type: "SAVE_WATCH"; watch: Watch }
  | { type: "DELETE_WATCH"; watchId: string }
  | { type: "ARM_WATCH"; watchId: string }
  | { type: "SAVE_SETTINGS"; settings: AppSettings }
  | { type: "LIST_ATTACHABLE_TABS" }
  | { type: "ATTACH_TAB"; tabId: number; rules?: WatchRules }
  | { type: "END_RUN"; runId: string; outcome?: Run["outcome"] }
  | { type: "FOCUS_RUN_TAB"; runId: string }
  | { type: "OPEN_DASHBOARD" }
  | { type: "OPEN_QUEUE_LAB" }
  | { type: "PREVIEW_TONE"; tone: ToneId }
  | { type: "CONTENT_READY"; url: string }
  | { type: "GET_TAB_CONFIG" }
  | { type: "OBSERVATION"; observation: Observation }
  | { type: "LAB_OBSERVATION"; observation: Observation };

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
