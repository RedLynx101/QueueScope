import { ArrowLeft, CalendarClock, Check, ChevronRight, Info, Radar, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ALL_DAYS, WEEKDAY_LABELS } from "../core/schedule";
import type { ScheduleType, Watch, Weekday } from "../core/types";

function localInput(value?: number) {
  if (!value) return "";
  const date = new Date(value - new Date(value).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function lines(value: string[]) { return value.join("\n"); }
function list(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

export function WatchEditor({ initial, onCancel, onSave }: { initial: Watch; onCancel: () => void; onSave: (watch: Watch, arm: boolean) => Promise<void> }) {
  const [watch, setWatch] = useState(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const steps = useMemo(() => ["Page", "Timing", "Signals", "Review"], []);
  const update = (patch: Partial<Watch>) => setWatch((current) => ({ ...current, ...patch }));
  const updateSchedule = (patch: Partial<Watch["schedule"]>) => update({ schedule: { ...watch.schedule, ...patch } });
  const updateRules = (patch: Partial<Watch["rules"]>) => update({ rules: { ...watch.rules, ...patch } });
  const submit = async (arm: boolean) => {
    setBusy(true); setError("");
    try { await onSave(watch, arm); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save watch."); setBusy(false); }
  };
  return <div className="editor-shell">
    <div className="editor-top"><button className="icon-button" onClick={onCancel}><ArrowLeft size={18}/></button><div><span className="eyebrow">WATCH BUILDER</span><h2>{initial.name === "New page watch" ? "Create a page watch" : "Edit watch"}</h2></div></div>
    <div className="stepper">{steps.map((label, index) => <button key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => setStep(index)}><span>{index < step ? <Check size={13}/> : index + 1}</span>{label}</button>)}</div>

    <div className="editor-card">
      {step === 0 && <section className="form-section"><div className="section-heading"><Radar/><div><h3>Choose the page and operating profile</h3><p>QueueScope observes visible page state in a dedicated or attached tab.</p></div></div>
        <label>Watch name<input value={watch.name} maxLength={100} onChange={(event) => update({ name: event.target.value })}/></label>
        <label>Page URL<input type="url" value={watch.url} onChange={(event) => update({ url: event.target.value })}/><small>Access is requested only for this page’s origin when you arm it.</small></label>
        <div className="choice-grid">
          <button className={watch.profile === "scheduled" ? "choice active" : "choice"} onClick={() => update({ profile: "scheduled" })}><CalendarClock/><strong>Scheduled drop</strong><span>Open a bounded checking window around an event.</span></button>
          <button className={watch.profile === "passive" ? "choice active" : "choice"} onClick={() => update({ profile: "passive" })}><Radar/><strong>Passive scout</strong><span>Watch at a quiet cadence until you stop it.</span></button>
        </div>
        <div className="choice-grid">
          <button className={watch.mode === "guarded-refresh" ? "choice active" : "choice"} onClick={() => update({ mode: "guarded-refresh" })}><ShieldCheck/><strong>Guarded refresh</strong><span>Reload only while safe; lock on queue or challenge.</span></button>
          <button className={watch.mode === "observe-only" ? "choice active" : "choice"} onClick={() => update({ mode: "observe-only" })}><Radar/><strong>Observe only</strong><span>Never navigate. Best for attaching to a live tab.</span></button>
        </div>
      </section>}

      {step === 1 && <section className="form-section"><div className="section-heading"><CalendarClock/><div><h3>Set the monitoring window</h3><p>Start and stop define when checks are allowed. Expected time only changes cadence.</p></div></div>
        {watch.profile === "scheduled" ? <>
          <label>Recurrence<select value={watch.schedule.type} onChange={(event) => { const type = event.target.value as ScheduleType; updateSchedule({ type, startTime: watch.schedule.startTime || "08:50", expectedTime: watch.schedule.expectedTime || "09:00", stopTime: watch.schedule.stopTime || "10:00", weekdays: type === "custom" && !watch.schedule.weekdays.length ? [1, 2, 3, 4, 5] : watch.schedule.weekdays }); }}><option value="once">One time</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option><option value="custom">Custom weekdays</option></select></label>
          {watch.schedule.type === "once" ? <div className="field-grid three"><label>Start<input type="datetime-local" value={localInput(watch.schedule.startAt)} onChange={(event) => updateSchedule({ startAt: new Date(event.target.value).getTime() })}/></label><label>Expected drop<input type="datetime-local" value={localInput(watch.schedule.expectedAt)} onChange={(event) => updateSchedule({ expectedAt: new Date(event.target.value).getTime() })}/></label><label>Stop<input type="datetime-local" value={localInput(watch.schedule.stopAt)} onChange={(event) => updateSchedule({ stopAt: new Date(event.target.value).getTime() })}/></label></div> : <>
            <div className="field-grid three"><label>Start time<input type="time" value={watch.schedule.startTime || "08:50"} onChange={(event) => updateSchedule({ startTime: event.target.value })}/></label><label>Expected time<input type="time" value={watch.schedule.expectedTime || "09:00"} onChange={(event) => updateSchedule({ expectedTime: event.target.value })}/></label><label>Stop time<input type="time" value={watch.schedule.stopTime || "10:00"} onChange={(event) => updateSchedule({ stopTime: event.target.value })}/></label></div>
            {watch.schedule.type === "custom" && <div className="weekday-row">{ALL_DAYS.map((day) => <button key={day} className={watch.schedule.weekdays.includes(day) ? "selected" : ""} onClick={() => updateSchedule({ weekdays: watch.schedule.weekdays.includes(day) ? watch.schedule.weekdays.filter((item) => item !== day) : [...watch.schedule.weekdays, day] as Weekday[] })}>{WEEKDAY_LABELS[day]}</button>)}</div>}
          </>}
          <label className="toggle-row"><span><strong>Auto-start this schedule</strong><small>Starts the dedicated run when its window opens.</small></span><input type="checkbox" checked={watch.schedule.enabled} onChange={(event) => updateSchedule({ enabled: event.target.checked })}/></label>
        </> : <div className="callout"><Radar/><div><strong>Passive watches have no attempt ceiling.</strong><p>They keep checking at the baseline cadence until you stop the run. Queue and challenge signals still freeze navigation.</p></div></div>}
        <div className="field-grid three"><label>Baseline cadence (seconds)<input type="number" min="5" max="86400" value={watch.cadenceSeconds} onChange={(event) => update({ cadenceSeconds: Number(event.target.value) })}/><small>Used outside the expected-drop window.</small></label><label>Fast cadence (seconds)<input type="number" min="5" max="3600" value={watch.activeCadenceSeconds} onChange={(event) => update({ activeCadenceSeconds: Number(event.target.value) })}/></label><label>Jitter (%)<input type="number" min="0" max="50" value={watch.jitterPercent} onChange={(event) => update({ jitterPercent: Number(event.target.value) })}/></label></div>
        {watch.profile === "scheduled" && <div className="field-grid"><label>Fast window before (minutes)<input type="number" min="0" value={watch.fastWindowBeforeMinutes} onChange={(event) => update({ fastWindowBeforeMinutes: Number(event.target.value) })}/></label><label>Fast window after (minutes)<input type="number" min="0" value={watch.fastWindowAfterMinutes} onChange={(event) => update({ fastWindowAfterMinutes: Number(event.target.value) })}/></label></div>}
      </section>}

      {step === 2 && <section className="form-section"><div className="section-heading"><SlidersHorizontal/><div><h3>Describe visible page signals</h3><p>One plain-text phrase per line. Matching is case-insensitive and local.</p></div></div>
        <div className="field-grid"><label>Queue phrases <InfoTip text="A match locks the tab and stops guarded refresh."/><textarea value={lines(watch.rules.queueText)} onChange={(event) => updateRules({ queueText: list(event.target.value) })}/></label><label>Admitted phrases <InfoTip text="Only accepted after a queue lock, preventing premature admission."/><textarea value={lines(watch.rules.admittedText)} onChange={(event) => updateRules({ admittedText: list(event.target.value) })}/></label></div>
        <div className="field-grid"><label>Challenge phrases <InfoTip text="Verification or waiting-room pages trigger attention and lock navigation."/><textarea value={lines(watch.rules.challengeText)} onChange={(event) => updateRules({ challengeText: list(event.target.value) })}/></label><label>Unavailable phrases <InfoTip text="Useful context; this signal does not trigger availability."/><textarea value={lines(watch.rules.unavailableText)} onChange={(event) => updateRules({ unavailableText: list(event.target.value) })}/></label></div>
        <label>Availability CSS selector <InfoTip text="A matching visible element is treated as an availability signal."/><input value={watch.rules.availableSelector || ""} onChange={(event) => updateRules({ availableSelector: event.target.value })}/></label>
        <div className="field-grid"><label>Position pattern <InfoTip text="The first capture group should contain the numeric position."/><input value={watch.rules.positionPattern || ""} onChange={(event) => updateRules({ positionPattern: event.target.value })}/></label><label>ETA pattern <InfoTip text="The first capture group can be HH:MM:SS, minutes, or a time label."/><input value={watch.rules.etaPattern || ""} onChange={(event) => updateRules({ etaPattern: event.target.value })}/></label></div>
      </section>}

      {step === 3 && <section className="form-section review-section"><div className="section-heading"><ShieldCheck/><div><h3>Ready to save</h3><p>Everything stays in extension-local storage. QueueScope never checks out or bypasses site controls.</p></div></div>
        <div className="review-grid"><div><span>PROFILE</span><strong>{watch.profile}</strong></div><div><span>MODE</span><strong>{watch.mode}</strong></div><div><span>CADENCE</span><strong>{watch.cadenceSeconds}s / {watch.activeCadenceSeconds}s fast</strong></div><div><span>AUTO-START</span><strong>{watch.schedule.enabled ? "On" : "Off"}</strong></div></div>
        <div className="safety-card"><ShieldCheck/><div><strong>Safety invariant</strong><p>Once configured queue or challenge evidence appears, guarded navigation is inhibited for that run. Admission requires prior queue evidence.</p></div></div>
      </section>}
      {error && <div className="form-error">{error}</div>}
      <footer className="editor-actions"><button className="button ghost" onClick={step ? () => setStep(step - 1) : onCancel}>{step ? "Back" : "Cancel"}</button>{step < steps.length - 1 ? <button className="button primary" onClick={() => setStep(step + 1)}>Continue <ChevronRight size={15}/></button> : <><button className="button ghost" disabled={busy} onClick={() => void submit(false)}>Save watch</button><button className="button primary" disabled={busy} onClick={() => void submit(true)}><ShieldCheck size={15}/>Save & arm</button></>}</footer>
    </div>
  </div>;
}

function InfoTip({ text }: { text: string }) { return <span className="info-tip" tabIndex={0}><Info size={13}/><span>{text}</span></span>; }
