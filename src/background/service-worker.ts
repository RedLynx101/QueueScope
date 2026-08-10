import { createDefaultWatch, PASSIVE_STOP_AT } from "../core/defaults";
import { activeOccurrence, currentOrNextOccurrence } from "../core/schedule";
import { advanceClock, applyObservation, createRun, endRun, recordCheck, refreshDecision } from "../core/state-machine";
import { loadSnapshot, saveSnapshot } from "../core/storage";
import type { AppSnapshot, AttachableTab, Observation, Run, RuntimeRequest, RuntimeResponse, ToneId, WatchRules } from "../core/types";
import { canonicalizeUrl, isRuntimeRequest, normalizeSettings, normalizeWatch } from "../core/validation";

const RECONCILE_ALARM = "queuescope:reconcile";
const RUN_ALARM_PREFIX = "queuescope:run:";
let snapshotPromise: Promise<AppSnapshot> | undefined;
let mutationQueue = Promise.resolve();

function snapshot(): Promise<AppSnapshot> {
  snapshotPromise ??= loadSnapshot();
  return snapshotPromise;
}

async function mutate<T>(operation: (value: AppSnapshot) => Promise<T> | T): Promise<T> {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (error: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    try {
      const value = await snapshot();
      const response = await operation(value);
      await saveSnapshot(value);
      resolveResult(response);
    } catch (error) {
      rejectResult(error);
    }
  });
  return result;
}

function response<T>(data?: T): RuntimeResponse<T> {
  return { ok: true, data };
}

function failure(error: unknown): RuntimeResponse {
  return { ok: false, error: error instanceof Error ? error.message : "QueueScope could not complete the request." };
}

function isHttpUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

async function hasPermission(url: string): Promise<boolean> {
  const origin = `${new URL(url).origin}/*`;
  return chrome.permissions.contains({ origins: [origin] });
}

async function injectObserver(tabId: number) {
  try {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: false }, files: ["observer.js"] });
  } catch {
    // Restricted pages and closing tabs are intentionally ignored.
  }
}

function runAlarmName(runId: string): string {
  return `${RUN_ALARM_PREFIX}${runId}`;
}

async function scheduleRun(run: Run) {
  await chrome.alarms.clear(runAlarmName(run.id));
  if (["COMPLETE", "EXPIRED", "FAILED", "ADMITTED"].includes(run.state) || run.queueLocked) return;
  const when = Math.max(Date.now() + 250, run.nextCheckAt ?? run.startAt);
  await chrome.alarms.create(runAlarmName(run.id), { when });
}

async function ensureOffscreen() {
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK], justification: "Play local user-selected attention tones." });
  }
}

async function playTone(tone: ToneId) {
  await ensureOffscreen();
  await chrome.runtime.sendMessage({ type: "PLAY_TONE_INTERNAL", tone });
}

async function notify(run: Run, title: string, message: string, priority = 1) {
  const value = await snapshot();
  if (!value.settings.notificationsEnabled) return;
  await chrome.notifications.create(`queuescope:${run.id}:${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title,
    message: message.slice(0, 240),
    priority,
    requireInteraction: priority === 2
  });
  if (value.settings.soundEnabled) await playTone(value.settings.tone);
}

async function armWatchById(watchId: string): Promise<Run> {
  const result = await mutate(async (value) => {
    const watch = value.watches.find((item) => item.id === watchId);
    if (!watch) throw new Error("Watch not found.");
    const existing = value.activeRuns.find((run) => run.watchId === watch.id || run.url === watch.url);
    if (existing) return existing;
    const occurrence = currentOrNextOccurrence(watch);
    if (!occurrence) throw new Error("This watch has no current or future occurrence.");
    if (!await hasPermission(watch.url)) throw new Error("Page access has not been granted for this origin.");
    const tab = await chrome.tabs.create({ url: watch.url, active: false });
    if (tab.id === undefined) throw new Error("Chrome did not create a preserved tab.");
    const run = { ...createRun(watch, occurrence), tabId: tab.id };
    value.activeRuns.push(run);
    return run;
  });
  await scheduleRun(result);
  if (result.tabId !== undefined) await injectObserver(result.tabId);
  return result;
}

async function reconcileAutoStart() {
  const value = await snapshot();
  for (const watch of value.watches) {
    if (!watch.schedule.enabled || !activeOccurrence(watch)) continue;
    if (!value.activeRuns.some((run) => run.watchId === watch.id && run.occurrenceKey === currentOrNextOccurrence(watch)?.occurrenceKey)) {
      try { await armWatchById(watch.id); } catch { /* Permission may require a future user gesture. */ }
    }
  }
}

async function processRun(runId: string) {
  const result = await mutate(async (value) => {
    const index = value.activeRuns.findIndex((run) => run.id === runId);
    if (index < 0) return undefined;
    let run = advanceClock(value.activeRuns[index]);
    const decision = refreshDecision(run);
    if (decision.action === "stop") {
      run = endRun(run, "missed");
      value.activeRuns.splice(index, 1);
      value.history.unshift(run);
      return { run, action: "stop" as const };
    }
    if (["refresh", "observe"].includes(decision.action)) run = recordCheck(run);
    value.activeRuns[index] = run;
    return { run, action: decision.action };
  });
  if (!result) return;
  const { run, action } = result;
  if (run.tabId !== undefined && action === "refresh") {
    try { await chrome.tabs.reload(run.tabId); } catch { /* Closing tabs become recoverable errors on the next pass. */ }
  }
  if (run.tabId !== undefined && action === "observe") await injectObserver(run.tabId);
  await scheduleRun(run);
}

function sanitizeObservation(input: Observation): Observation {
  return {
    observedAt: Math.min(Math.max(Number(input.observedAt) || Date.now(), Date.now() - 5 * 60_000), Date.now() + 10_000),
    url: isHttpUrl(input.url) || input.url.startsWith(chrome.runtime.getURL("")) ? input.url.slice(0, 2048) : "",
    title: String(input.title ?? "").slice(0, 180),
    classification: ["product", "available", "unavailable", "queue", "challenge", "admitted", "unknown"].includes(input.classification) ? input.classification : "unknown",
    confidence: Math.min(Math.max(Number(input.confidence) || 0, 0), 1),
    evidence: Array.isArray(input.evidence) ? input.evidence.filter((item): item is string => typeof item === "string").slice(0, 8).map((item) => item.slice(0, 240)) : [],
    position: Number.isFinite(input.position) && (input.position ?? -1) >= 0 ? Math.min(input.position!, 1_000_000_000) : undefined,
    providerEtaAt: Number.isFinite(input.providerEtaAt) && (input.providerEtaAt ?? 0) > 0 ? Math.min(input.providerEtaAt!, Date.now() + 7 * 24 * 60 * 60_000) : undefined,
    providerEtaLabel: typeof input.providerEtaLabel === "string" ? input.providerEtaLabel.slice(0, 80) : undefined
  };
}

async function acceptObservation(tabId: number, raw: Observation) {
  const observation = sanitizeObservation(raw);
  const result = await mutate(async (value) => {
    const index = value.activeRuns.findIndex((run) => run.tabId === tabId);
    if (index < 0) return undefined;
    const previous = value.activeRuns[index];
    const updated = applyObservation(previous, observation);
    value.activeRuns[index] = updated;
    return { previous, updated };
  });
  if (!result) return;
  const { previous, updated } = result;
  if (updated.queueLocked && !previous.queueLocked && updated.tabId !== undefined) {
    await chrome.tabs.update(updated.tabId, { autoDiscardable: false });
    await notify(updated, "QueueScope safety lock", "Refresh stopped because a queue or challenge signal appeared.", 2);
  }
  if (updated.lastObservation?.classification === "available" && previous.lastObservation?.classification !== "available") {
    await notify(updated, "Configured signal is available", updated.watchName, 2);
  }
  if (updated.state === "ADMITTED" && previous.state !== "ADMITTED") {
    await notify(updated, "Queue admission detected", updated.watchName, 2);
    const value = await snapshot();
    if (value.settings.focusOnAdmission && updated.tabId !== undefined) await chrome.tabs.update(updated.tabId, { active: true });
  }
  const alertThreshold = (await snapshot()).settings.queueEtaAlertMinutes * 60_000;
  const remaining = updated.lastObservation?.providerEtaAt ? updated.lastObservation.providerEtaAt - Date.now() : undefined;
  const previousRemaining = previous.lastObservation?.providerEtaAt ? previous.lastObservation.providerEtaAt - Date.now() : undefined;
  if (remaining !== undefined && remaining > 0 && remaining <= alertThreshold && (previousRemaining === undefined || previousRemaining > alertThreshold)) {
    await notify(updated, "Queue turn is approaching", `${updated.watchName} · about ${Math.max(1, Math.ceil(remaining / 60_000))} minutes`, 2);
  }
  await scheduleRun(updated);
}

async function attachTab(tabId: number, rules?: WatchRules): Promise<Run> {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || !isHttpUrl(tab.url)) throw new Error("Only ordinary HTTP or HTTPS tabs can be attached.");
  const draft = createDefaultWatch();
  draft.name = tab.title?.slice(0, 100) || new URL(tab.url).hostname;
  draft.url = canonicalizeUrl(tab.url);
  draft.profile = "passive";
  draft.mode = "observe-only";
  if (rules) draft.rules = rules;
  const run = await mutate((value) => {
    const existing = value.activeRuns.find((item) => item.tabId === tabId);
    if (existing) return existing;
    const created = { ...createRun(draft, { occurrenceKey: `attached:${Date.now()}`, startAt: Date.now(), stopAt: Date.now() + 12 * 60 * 60_000 }, Date.now(), true), tabId };
    value.activeRuns.push(created);
    return created;
  });
  await injectObserver(tabId);
  return run;
}

async function openQueueLab(): Promise<Run> {
  const url = chrome.runtime.getURL("harness/index.html");
  const tab = await chrome.tabs.create({ url, active: true });
  if (tab.id === undefined) throw new Error("Chrome did not open Queue Lab.");
  const watch = createDefaultWatch();
  watch.name = "Queue Lab rehearsal";
  watch.url = url;
  watch.profile = "passive";
  watch.mode = "observe-only";
  const run = await mutate((value) => {
    const created = { ...createRun(watch, { occurrenceKey: `lab:${Date.now()}`, startAt: Date.now(), stopAt: PASSIVE_STOP_AT }, Date.now(), true), tabId: tab.id };
    value.activeRuns.push(created);
    return created;
  });
  return run;
}

async function handle(request: RuntimeRequest, sender: chrome.runtime.MessageSender): Promise<RuntimeResponse> {
  try {
    if (request.type === "GET_SNAPSHOT") return response(await snapshot());
    if (request.type === "SAVE_WATCH") {
      const watch = normalizeWatch(request.watch);
      await mutate((value) => {
        const index = value.watches.findIndex((item) => item.id === watch.id);
        if (index >= 0) value.watches[index] = watch; else value.watches.push(watch);
      });
      if (watch.schedule.enabled) await reconcileAutoStart();
      return response(watch);
    }
    if (request.type === "DELETE_WATCH") {
      await mutate((value) => { value.watches = value.watches.filter((watch) => watch.id !== request.watchId); });
      return response();
    }
    if (request.type === "ARM_WATCH") return response(await armWatchById(request.watchId));
    if (request.type === "SAVE_SETTINGS") {
      const settings = normalizeSettings(request.settings);
      await mutate((value) => {
        value.settings = settings;
        const cutoff = Date.now() - settings.retentionDays * 24 * 60 * 60_000;
        value.history = value.history.filter((run) => (run.endedAt ?? run.createdAt) >= cutoff).slice(0, 500);
      });
      return response(settings);
    }
    if (request.type === "LIST_ATTACHABLE_TABS") {
      const value = await snapshot();
      const tabs = await chrome.tabs.query({});
      const data: AttachableTab[] = tabs.filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } => tab.id !== undefined && Boolean(tab.url && isHttpUrl(tab.url))).map((tab) => ({ id: tab.id, title: tab.title?.slice(0, 120) || new URL(tab.url).hostname, url: tab.url, active: tab.active, attached: value.activeRuns.some((run) => run.tabId === tab.id) }));
      return response(data);
    }
    if (request.type === "ATTACH_TAB") return response(await attachTab(request.tabId, request.rules));
    if (request.type === "END_RUN") {
      const completed = await mutate((value) => {
        const index = value.activeRuns.findIndex((run) => run.id === request.runId);
        if (index < 0) throw new Error("Run not found.");
        const run = endRun(value.activeRuns[index], request.outcome);
        value.activeRuns.splice(index, 1);
        value.history.unshift(run);
        value.history = value.history.slice(0, 500);
        return run;
      });
      await chrome.alarms.clear(runAlarmName(completed.id));
      if (completed.tabId !== undefined) await chrome.tabs.update(completed.tabId, { autoDiscardable: true });
      return response(completed);
    }
    if (request.type === "FOCUS_RUN_TAB") {
      const run = (await snapshot()).activeRuns.find((item) => item.id === request.runId);
      if (!run?.tabId) throw new Error("Run tab is unavailable.");
      await chrome.tabs.update(run.tabId, { active: true });
      return response();
    }
    if (request.type === "OPEN_DASHBOARD") { await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") }); return response(); }
    if (request.type === "OPEN_QUEUE_LAB") return response(await openQueueLab());
    if (request.type === "PREVIEW_TONE") { await playTone(request.tone); return response(); }
    if (request.type === "CONTENT_READY") { if (sender.tab?.id !== undefined) await injectObserver(sender.tab.id); return response(); }
    if (request.type === "GET_TAB_CONFIG") {
      const run = (await snapshot()).activeRuns.find((item) => item.tabId === sender.tab?.id);
      if (!run) throw new Error("No active run owns this tab.");
      return response({ rules: run.rules, priorQueueLock: run.queueLocked });
    }
    if (request.type === "OBSERVATION") {
      if (sender.tab?.id === undefined) throw new Error("Observation has no browser tab.");
      await acceptObservation(sender.tab.id, request.observation);
      return response();
    }
    if (request.type === "LAB_OBSERVATION") {
      if (!sender.url?.startsWith(chrome.runtime.getURL("harness/"))) throw new Error("Queue Lab observation came from an untrusted page.");
      const labRun = (await snapshot()).activeRuns.find((run) => run.url === sender.url || run.url === chrome.runtime.getURL("harness/index.html"));
      if (labRun?.tabId === undefined) throw new Error("Queue Lab run is unavailable.");
      await acceptObservation(labRun.tabId, request.observation);
      return response();
    }
    return failure("Unsupported request.");
  } catch (error) {
    return failure(error);
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isRuntimeRequest(message)) return false;
  void handle(message, sender).then(sendResponse);
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECONCILE_ALARM) void reconcileAutoStart();
  if (alarm.name.startsWith(RUN_ALARM_PREFIX)) void processRun(alarm.name.slice(RUN_ALARM_PREFIX.length));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  void snapshot().then((value) => { if (value.activeRuns.some((run) => run.tabId === tabId && isHttpUrl(run.url))) void injectObserver(tabId); });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void mutate((value) => {
    const run = value.activeRuns.find((item) => item.tabId === tabId);
    if (!run) return;
    run.tabId = undefined;
    run.error = "Preserved tab was closed.";
    run.state = "FAILED";
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  const runId = notificationId.split(":")[1];
  void snapshot().then((value) => {
    const run = value.activeRuns.find((item) => item.id === runId);
    if (run?.tabId !== undefined) void chrome.tabs.update(run.tabId, { active: true });
  });
});

async function initialize() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 1 });
  const value = await snapshot();
  for (const run of value.activeRuns) {
    if (run.queueLocked && run.tabId !== undefined) await chrome.tabs.update(run.tabId, { autoDiscardable: false });
    if (run.tabId !== undefined && isHttpUrl(run.url)) await injectObserver(run.tabId);
    await scheduleRun(run);
  }
  await reconcileAutoStart();
}

chrome.runtime.onInstalled.addListener(() => void initialize());
chrome.runtime.onStartup.addListener(() => void initialize());
void initialize();
