import { MAX_EVENT_HISTORY } from "./defaults";
import type { RunWindow } from "./schedule";
import type { Observation, Run, RunEvent, RunState, Watch } from "./types";

function event(type: RunEvent["type"], label: string, at: number, detail?: string): RunEvent {
  return { id: crypto.randomUUID(), type, label, at, detail };
}

function append(run: Run, item: RunEvent): RunEvent[] {
  return [...run.events, item].slice(-MAX_EVENT_HISTORY);
}

function state(run: Run, next: RunState, now: number): Run {
  return run.state === next ? run : { ...run, state: next, stateChangedAt: now };
}

export function cadenceFor(run: Pick<Run, "cadenceSeconds" | "activeCadenceSeconds" | "fastWindowBeforeMinutes" | "fastWindowAfterMinutes" | "expectedAt">, now: number): number {
  if (!run.expectedAt) return run.cadenceSeconds;
  const begins = run.expectedAt - run.fastWindowBeforeMinutes * 60_000;
  const ends = run.expectedAt + run.fastWindowAfterMinutes * 60_000;
  return now >= begins && now <= ends ? run.activeCadenceSeconds : run.cadenceSeconds;
}

export function nextCheckAt(run: Pick<Run, "cadenceSeconds" | "activeCadenceSeconds" | "fastWindowBeforeMinutes" | "fastWindowAfterMinutes" | "expectedAt" | "jitterPercent">, now: number, random = Math.random): number {
  const base = cadenceFor(run, now) * 1000;
  const jitter = Math.min(Math.max(run.jitterPercent, 0), 50) / 100;
  return now + Math.max(5_000, Math.round(base * (1 + (random() * 2 - 1) * jitter)));
}

export function createRun(watch: Watch, window: RunWindow, now = Date.now(), attached = false): Run {
  const active = attached || now >= window.startAt;
  return {
    id: crypto.randomUUID(),
    watchId: attached ? undefined : watch.id,
    watchName: watch.name,
    occurrenceKey: attached ? `attached:${now}` : window.occurrenceKey,
    url: watch.url,
    profile: attached ? "passive" : watch.profile,
    mode: attached ? "observe-only" : watch.mode,
    state: active ? "ACTIVE_CHECK" : "ARMED",
    stateChangedAt: now,
    createdAt: now,
    startAt: attached ? now : window.startAt,
    stopAt: attached ? now + 12 * 60 * 60_000 : window.stopAt,
    expectedAt: window.expectedAt,
    nextCheckAt: active ? now : window.startAt,
    checkCount: 0,
    cadenceSeconds: watch.cadenceSeconds,
    activeCadenceSeconds: watch.activeCadenceSeconds,
    fastWindowBeforeMinutes: watch.fastWindowBeforeMinutes,
    fastWindowAfterMinutes: watch.fastWindowAfterMinutes,
    jitterPercent: watch.jitterPercent,
    queueLocked: false,
    attached,
    rules: structuredClone(watch.rules),
    events: [event("armed", attached ? "Attached without refreshing" : active ? "Run armed and checking window open" : "Run armed", now)]
  };
}

export function advanceClock(run: Run, now = Date.now()): Run {
  if (["COMPLETE", "EXPIRED", "FAILED"].includes(run.state)) return run;
  if (now >= run.stopAt && !run.queueLocked && run.state !== "ADMITTED") {
    const expired = state(run, "EXPIRED", now);
    return { ...expired, endedAt: now, events: append(expired, event("ended", "Monitoring window expired", now)) };
  }
  if (run.state === "ARMED" && now >= run.startAt) {
    const active = state(run, "ACTIVE_CHECK", now);
    return { ...active, nextCheckAt: now, events: append(active, event("started", "Monitoring window opened", now)) };
  }
  return run;
}

export function applyObservation(run: Run, observation: Observation): Run {
  if (["COMPLETE", "EXPIRED", "FAILED"].includes(run.state)) return run;
  const now = observation.observedAt;
  const lock = observation.classification === "queue" || observation.classification === "challenge";
  let next: RunState = "ACTIVE_CHECK";
  if (observation.classification === "queue") next = "WAITING";
  if (["challenge", "available"].includes(observation.classification)) next = "ATTENTION";
  if (observation.classification === "admitted" && run.queueLocked) next = "ADMITTED";
  if (run.queueLocked && !["admitted", "challenge"].includes(observation.classification)) next = run.state === "ADMITTED" ? "ADMITTED" : "WAITING";
  let updated = state(run, next, now);
  let events = updated.events;
  if (run.lastObservation?.classification !== observation.classification) {
    events = [...events, event("observation", `Page classified as ${observation.classification}`, now, observation.evidence[0])];
  }
  if (lock && !run.queueLocked) events = [...events, event("queue-lock", "Safety lock engaged", now, `${observation.classification}: refresh inhibited`)];
  if (observation.classification === "available") events = [...events, event("attention", "Configured availability signal detected", now, observation.evidence[0])];
  if (observation.classification === "admitted" && run.queueLocked) events = [...events, event("admitted", "Post-queue admission detected", now)];
  if (observation.classification === "challenge") events = [...events, event("attention", "Manual attention required", now, observation.evidence[0])];
  updated = {
    ...updated,
    queueLocked: run.queueLocked || lock,
    queueLockReason: run.queueLockReason ?? (lock ? `${observation.classification} detected at ${new Date(now).toLocaleTimeString()}` : undefined),
    lastObservation: observation,
    events: events.slice(-MAX_EVENT_HISTORY)
  };
  return updated;
}

export function recordCheck(run: Run, now = Date.now(), random = Math.random): Run {
  const checkCount = run.checkCount + 1;
  return {
    ...run,
    checkCount,
    nextCheckAt: nextCheckAt(run, now, random),
    events: append(run, event("check", run.mode === "observe-only" ? `Observation heartbeat ${checkCount}` : `Guarded refresh ${checkCount} dispatched`, now))
  };
}

export function endRun(run: Run, outcome: Run["outcome"] = "unknown", now = Date.now()): Run {
  const complete = state(run, "COMPLETE", now);
  return { ...complete, endedAt: now, outcome, events: append(complete, event("ended", "Run ended by user", now, `Outcome: ${outcome}`)) };
}

export function refreshDecision(run: Run, now = Date.now()): { action: "wait" | "refresh" | "observe" | "stop" | "locked"; reason: string } {
  if (run.queueLocked) return { action: "locked", reason: "A safety lock is active." };
  if (now < run.startAt) return { action: "wait", reason: "The monitoring window has not opened." };
  if (now >= run.stopAt) return { action: "stop", reason: "The monitoring window has ended." };
  if (run.state !== "ACTIVE_CHECK") return { action: "wait", reason: `State ${run.state} does not permit refresh.` };
  if (["available", "admitted"].includes(run.lastObservation?.classification ?? "")) return { action: "wait", reason: "An attention state is already present." };
  if ((run.nextCheckAt ?? run.startAt) > now) return { action: "wait", reason: "The next check is not due." };
  if (run.mode === "observe-only" || run.attached) return { action: "observe", reason: "Observation heartbeat is due; navigation remains disabled." };
  return { action: "refresh", reason: "A guarded refresh is due." };
}
