import {
  BellRing, CalendarCheck2, ChevronDown, CircleStop, Clock3, Copy, ExternalLink, Focus,
  MoreHorizontal, Play, Radio, ShieldCheck, Sparkles, Trash2
} from "lucide-react";
import { useState } from "react";
import { describeSchedule } from "../core/schedule";
import type { Run, Watch } from "../core/types";

export function StatePill({ run }: { run: Run }) {
  const label = run.state === "ADMITTED" ? "ADMITTED" : run.queueLocked ? "LOCKED" : run.state.replace("_", " ");
  return <span className={`state-pill state-${run.state.toLowerCase()}`}><span className="pulse-dot" />{label}</span>;
}

function time(value?: number) {
  return value ? new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(value) : "—";
}

function countdown(value?: number) {
  if (!value) return "—";
  const ms = value - Date.now();
  if (ms <= 0) return "due now";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function RunCard({ run, expandedByDefault, onFocus, onEnd }: {
  run: Run; expandedByDefault: boolean; onFocus: () => void; onEnd: () => void;
}) {
  const [open, setOpen] = useState(expandedByDefault);
  const host = (() => { try { const url = new URL(run.url); return url.protocol === "chrome-extension:" ? "Queue Lab" : url.hostname; } catch { return "attached page"; } })();
  const observation = run.lastObservation;
  return <article className={`run-card ${open ? "is-open" : ""} ${run.queueLocked ? "is-locked" : ""}`}>
    <button className="run-card-head" onClick={() => setOpen(!open)} aria-expanded={open}>
      <div className="run-signal"><Radio size={15} /><span>LIVE RUN · {host}</span></div>
      <StatePill run={run} />
      <div className="run-title-group"><h3>{run.watchName}</h3><p>{run.queueLocked ? "Navigation safety lock engaged" : observation?.evidence[0] || `Next check ${countdown(run.nextCheckAt)}`}</p></div>
      <ChevronDown className="run-chevron" size={18} />
    </button>
    {open && <div className="run-details">
      <div className="time-rail">
        <div><span>START</span><strong>{time(run.startAt)}</strong></div>
        <i />
        <div><span>EXPECTED</span><strong>{time(run.expectedAt)}</strong></div>
        <i />
        <div><span>STOP</span><strong>{run.profile === "passive" ? "MANUAL" : time(run.stopAt)}</strong></div>
      </div>
      <div className="metric-grid">
        <div><span>Page state</span><strong>{observation?.classification || "Awaiting sample"}</strong></div>
        <div><span>Position</span><strong>{observation?.position?.toLocaleString() || "Not exposed"}</strong></div>
        <div><span>Provider ETA</span><strong>{observation?.providerEtaLabel || countdown(observation?.providerEtaAt)}</strong></div>
        <div><span>Checks</span><strong>{run.checkCount}</strong></div>
      </div>
      <div className="safety-strip"><ShieldCheck size={16}/><div><strong>{run.queueLocked ? "Queue lock armed" : "Guarded navigation"}</strong><span>{run.queueLocked ? run.queueLockReason : run.mode === "observe-only" ? "Attached without refreshing" : "Refresh stops on queue or challenge evidence"}</span></div></div>
      <div className="event-list">
        {run.events.slice(-3).reverse().map((event) => <div key={event.id}><time>{time(event.at)}</time><span>{event.label}</span></div>)}
      </div>
      <div className="card-actions"><button className="button ghost" onClick={onFocus}><Focus size={15}/>Open page</button><button className="button danger" onClick={onEnd}><CircleStop size={15}/>End run</button></div>
    </div>}
  </article>;
}

export function WatchCard({ watch, active, onArm, onCopy, onEdit, onDelete, onAutoStart }: {
  watch: Watch; active: boolean; onArm: () => void; onCopy: () => void; onEdit: () => void; onDelete: () => void; onAutoStart: () => void;
}) {
  const host = (() => { try { return new URL(watch.url).hostname; } catch { return "Invalid URL"; } })();
  return <article className="watch-card">
    <div className="watch-icon"><Clock3 size={18}/></div>
    <div className="watch-main"><div className="eyebrow">{watch.profile} · {host}</div><h3>{watch.name}</h3><p>{describeSchedule(watch)} · {watch.mode === "guarded-refresh" ? "guarded refresh" : "observe only"}</p></div>
    <div className="watch-actions">
      <button className={`button ${active ? "success" : "primary"}`} onClick={onArm} disabled={active}>{active ? <ShieldCheck size={15}/> : <Play size={15}/>} {active ? "Armed" : "Arm"}</button>
      <button className={`icon-button ${watch.schedule.enabled ? "auto-on" : ""}`} title={`Auto-start ${watch.schedule.enabled ? "on" : "off"}; click to toggle`} onClick={onAutoStart}><CalendarCheck2 size={16}/></button>
      <button className="icon-button" title="Edit watch" onClick={onEdit}><MoreHorizontal size={17}/></button>
      <button className="icon-button" title="Copy watch" onClick={onCopy}><Copy size={16}/></button>
      <button className="icon-button danger-icon" title="Delete watch" onClick={onDelete}><Trash2 size={16}/></button>
    </div>
  </article>;
}

export function EmptyState({ type, action }: { type: "runs" | "watches" | "history"; action?: () => void }) {
  const copy = type === "runs" ? ["No live runs", "Arm a saved watch or attach an open tab. QueueScope will keep the operational state here."] : type === "watches" ? ["Build your first watch", "Define visible page signals, a schedule, and a safe observation cadence."] : ["The ledger is quiet", "Completed runs and their local event trails will appear here."];
  return <div className="empty-state"><div className="empty-orbit"><Sparkles size={22}/></div><h3>{copy[0]}</h3><p>{copy[1]}</p>{action && <button className="button primary" onClick={action}><Play size={15}/>Get started</button>}</div>;
}

export function AttentionBanner({ count }: { count: number }) {
  if (!count) return null;
  return <div className="attention-banner"><BellRing size={18}/><div><strong>{count} run{count === 1 ? "" : "s"} need attention</strong><span>A configured signal or manual verification state is active.</span></div><ExternalLink size={16}/></div>;
}
