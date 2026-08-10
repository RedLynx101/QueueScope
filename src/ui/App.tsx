import {
  Activity, Bell, BookOpen, ChevronDown, Clock3,
  FlaskConical, Gauge, History, LayoutDashboard, Menu, PanelRightOpen, Plus,
  Radar, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Volume2, X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createDefaultWatch } from "../core/defaults";
import { isOlderWatch } from "../core/schedule";
import type { AppSettings, AppSnapshot, AttachableTab, RuntimeRequest, Run, ToneId, Watch } from "../core/types";
import { EmptyState, AttentionBanner, RunCard, WatchCard } from "./components";
import { isPanelSurface, onSnapshotChange, requestPageAccess, send } from "./platform";
import { WatchEditor } from "./WatchEditor";

type Page = "overview" | "runs" | "watches" | "lab" | "settings" | "activity";

const nav: { id: Page; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Command center", icon: LayoutDashboard },
  { id: "runs", label: "Live runs", icon: Activity },
  { id: "watches", label: "Watches", icon: Radar },
  { id: "lab", label: "Queue Lab", icon: FlaskConical },
  { id: "activity", label: "Activity", icon: History },
  { id: "settings", label: "Settings", icon: Settings2 }
];

const panelNav: typeof nav = [nav[1], nav[2], nav[4]];

function readableError(reason: unknown) { return reason instanceof Error ? reason.message : "Something went wrong."; }

export function App() {
  const panel = isPanelSurface();
  const [snapshot, setSnapshot] = useState<AppSnapshot>();
  const [page, setPage] = useState<Page>(panel ? "runs" : "overview");
  const [editor, setEditor] = useState<Watch>();
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [tabs, setTabs] = useState<AttachableTab[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [olderOpen, setOlderOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const refresh = useCallback(async () => {
    try { setSnapshot(await send<AppSnapshot>({ type: "GET_SNAPSHOT" })); } catch (reason) { setToast(readableError(reason)); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = onSnapshotChange(() => void refresh());
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [refresh]);
  useEffect(() => {
    if (!snapshot) return;
    document.documentElement.dataset.motion = snapshot.settings.motion;
    document.documentElement.dataset.density = snapshot.settings.density;
  }, [snapshot]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeIds = useMemo(() => new Set(snapshot?.activeRuns.map((run) => run.watchId).filter(Boolean)), [snapshot]);
  const attention = snapshot?.activeRuns.filter((run) => ["ATTENTION", "ADMITTED"].includes(run.state)).length || 0;

  async function act(request: RuntimeRequest, success?: string) {
    setBusy(true);
    try { await send(request); if (success) setToast(success); await refresh(); }
    catch (reason) { setToast(readableError(reason)); }
    finally { setBusy(false); }
  }

  async function arm(watch: Watch) {
    const granted = await requestPageAccess(watch.url);
    if (!granted) throw new Error("Page access was not granted.");
    await send({ type: "ARM_WATCH", watchId: watch.id });
    await refresh();
  }

  async function saveWatch(watch: Watch, armAfter: boolean) {
    await send<Watch>({ type: "SAVE_WATCH", watch });
    if (armAfter) await arm(watch);
    setEditor(undefined); setToast(armAfter ? "Watch saved and armed." : "Watch saved."); await refresh();
  }

  async function openAttach() {
    setBusy(true);
    try { setTabs(await send<AttachableTab[]>({ type: "LIST_ATTACHABLE_TABS" })); setAttachOpen(true); }
    catch (reason) { setToast(readableError(reason)); }
    finally { setBusy(false); }
  }

  async function attach(tab: AttachableTab) {
    const granted = await requestPageAccess(tab.url);
    if (!granted) throw new Error("Page access was not granted.");
    await act({ type: "ATTACH_TAB", tabId: tab.id }, "Tab attached without refreshing.");
    setAttachOpen(false);
  }

  function toggleAutoStart(watch: Watch) {
    void act({ type: "SAVE_WATCH", watch: { ...watch, schedule: { ...watch.schedule, enabled: !watch.schedule.enabled } } }, `Auto-start ${watch.schedule.enabled ? "disabled" : "enabled"}.`);
  }

  function copyDirect(watch: Watch) {
    const copy = structuredClone(watch);
    copy.id = crypto.randomUUID();
    copy.name = `${watch.name} — copy`;
    copy.schedule.enabled = false;
    copy.createdAt = Date.now();
    void act({ type: "SAVE_WATCH", watch: copy }, "Paused copy saved.");
  }

  if (!snapshot) return <div className="boot-screen"><BrandMark/><p>Establishing local scope…</p></div>;
  if (editor && !panel) return <AppFrame panel={false} page="watches" setPage={setPage} mobileNav={mobileNav} setMobileNav={setMobileNav}><WatchEditor initial={editor} onCancel={() => setEditor(undefined)} onSave={saveWatch}/></AppFrame>;

  const currentNav = panel ? panelNav : nav;
  return <AppFrame panel={panel} page={page} setPage={(next) => { setPage(next); setMobileNav(false); }} mobileNav={mobileNav} setMobileNav={setMobileNav}>
    {panel ? <PanelContent page={page} snapshot={snapshot} activeIds={activeIds} olderOpen={olderOpen} setOlderOpen={setOlderOpen} setPage={setPage} onFocus={(run) => void act({ type: "FOCUS_RUN_TAB", runId: run.id })} onEnd={(run) => void act({ type: "END_RUN", runId: run.id, outcome: "abandoned" }, "Run moved to history.")} onArm={(watch) => void arm(watch).catch((reason) => setToast(readableError(reason)))} onCopy={copyDirect} onAutoStart={toggleAutoStart} onDelete={(watch) => { if (window.confirm(`Delete “${watch.name}”?`)) void act({ type: "DELETE_WATCH", watchId: watch.id }, "Watch deleted."); }}/> : <>
      {page === "overview" && <Overview snapshot={snapshot} attention={attention} onNew={() => setEditor(createDefaultWatch())} onAttach={() => void openAttach()} onLab={() => void act({ type: "OPEN_QUEUE_LAB" })} onNavigate={setPage} onFocus={(run) => void act({ type: "FOCUS_RUN_TAB", runId: run.id })} onEnd={(run) => void act({ type: "END_RUN", runId: run.id, outcome: "abandoned" }, "Run moved to history.")}/>} 
      {page === "runs" && <RunsPage snapshot={snapshot} onAttach={() => void openAttach()} onFocus={(run) => void act({ type: "FOCUS_RUN_TAB", runId: run.id })} onEnd={(run) => void act({ type: "END_RUN", runId: run.id, outcome: "abandoned" }, "Run moved to history.")}/>} 
      {page === "watches" && <WatchesPage snapshot={snapshot} activeIds={activeIds} olderOpen={olderOpen} setOlderOpen={setOlderOpen} onNew={() => setEditor(createDefaultWatch())} onEdit={setEditor} onArm={(watch) => void arm(watch).catch((reason) => setToast(readableError(reason)))} onCopy={(watch) => { const copy = structuredClone(watch); copy.id = crypto.randomUUID(); copy.name = `${watch.name} — copy`; copy.schedule.enabled = false; copy.createdAt = Date.now(); setEditor(copy); }} onAutoStart={toggleAutoStart} onDelete={(watch) => { if (window.confirm(`Delete “${watch.name}”?`)) void act({ type: "DELETE_WATCH", watchId: watch.id }, "Watch deleted."); }}/>} 
      {page === "lab" && <LabPage onOpen={() => void act({ type: "OPEN_QUEUE_LAB" })}/>} 
      {page === "activity" && <ActivityPage snapshot={snapshot}/>} 
      {page === "settings" && <SettingsPage settings={snapshot.settings} onSave={(settings) => void act({ type: "SAVE_SETTINGS", settings }, "Settings saved.")} onTone={(tone) => void act({ type: "PREVIEW_TONE", tone })}/>} 
    </>}
    {attachOpen && <AttachDialog tabs={tabs} busy={busy} onClose={() => setAttachOpen(false)} onAttach={(tab) => void attach(tab).catch((reason) => setToast(readableError(reason)))}/>} 
    {toast && <div className="toast"><ShieldCheck size={17}/>{toast}</div>}
    <div className="busy-sr" aria-live="polite">{busy ? "Working" : ""}</div>
    <MobileBar items={currentNav} page={page} setPage={setPage}/>
  </AppFrame>;
}

function AppFrame({ panel, page, setPage, mobileNav, setMobileNav, children }: { panel: boolean; page: Page; setPage: (page: Page) => void; mobileNav: boolean; setMobileNav: (open: boolean) => void; children: React.ReactNode }) {
  if (panel) return <div className="panel-shell"><PanelHeader onMenu={() => setMobileNav(!mobileNav)}/>{mobileNav && <div className="panel-menu">{panelNav.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => { setPage(item.id); setMobileNav(false); }}/>) }<button onClick={() => void send({ type: "OPEN_DASHBOARD" })}><PanelRightOpen size={16}/>Command center</button></div>}<main className="panel-content">{children}</main><footer className="panel-footer"><ShieldCheck size={13}/><span>Safety lock ready</span><span>v0.1.1</span></footer></div>;
  return <div className="app-shell"><aside className="sidebar"><Brand/>
    <nav>{nav.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)}/>)}</nav>
    <div className="sidebar-foot"><div className="privacy-chip"><ShieldCheck size={16}/><div><strong>Local-first</strong><span>No remote backend</span></div></div><a href="https://github.com/RedLynx101/QueueScope" target="_blank" rel="noreferrer"><BookOpen size={15}/>Documentation</a></div>
  </aside><main className="main-content">{children}</main></div>;
}

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><img src="/icons/icon-128.png" alt=""/></span>; }
function Brand() { return <div className="brand"><BrandMark/><div><strong>QueueScope</strong><small>LOCAL OBSERVER</small></div></div>; }
function PanelHeader({ onMenu }: { onMenu: () => void }) { return <header className="panel-header"><Brand/><div><button className="icon-button" onClick={() => void send({ type: "OPEN_DASHBOARD" })} title="Open command center"><PanelRightOpen size={17}/></button><button className="icon-button" onClick={onMenu} title="Menu"><Menu size={18}/></button></div></header>; }
function NavButton({ item, active, onClick }: { item: typeof nav[number]; active: boolean; onClick: () => void }) { const Icon = item.icon; return <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}><Icon size={18}/><span>{item.label}</span>{item.id === "runs" && <i/>}</button>; }

function PageHeader({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) { return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>; }

function Overview({ snapshot, attention, onNew, onAttach, onLab, onNavigate, onFocus, onEnd }: { snapshot: AppSnapshot; attention: number; onNew: () => void; onAttach: () => void; onLab: () => void; onNavigate: (page: Page) => void; onFocus: (run: Run) => void; onEnd: (run: Run) => void }) {
  return <div className="page page-overview"><PageHeader eyebrow="COMMAND CENTER" title="Observe the moment. Preserve the tab." copy="Schedule page checks, recognize configured queue signals, and keep every run visible from one local console." actions={<><button className="button ghost" onClick={onAttach}><PanelRightOpen size={15}/>Attach tab</button><button className="button primary" onClick={onNew}><Plus size={15}/>New watch</button></>}/>
    <AttentionBanner count={attention}/>
    <div className="hero-grid"><section className="signal-hero"><div className="orbit-visual"><span/><i/><b/></div><div><span className="eyebrow">OPERATIONAL SCOPE</span><h2>{snapshot.activeRuns.length ? `${snapshot.activeRuns.length} live run${snapshot.activeRuns.length === 1 ? "" : "s"}` : "The field is clear"}</h2><p>{snapshot.activeRuns.some((run) => run.queueLocked) ? "At least one tab is under a navigation safety lock." : "No queue locks are currently engaged."}</p></div><button className="button signal" onClick={() => onNavigate("runs")}>Open live workspace <ChevronDown size={15}/></button></section>
      <section className="quick-stack"><button onClick={onLab}><FlaskConical/><div><strong>Run a Queue Lab rehearsal</strong><span>Walk through product → queue → admitted safely.</span></div><Sparkles size={16}/></button><button onClick={onAttach}><PanelRightOpen/><div><strong>Attach an open tab</strong><span>Observe a live page without refreshing it.</span></div><Plus size={16}/></button></section></div>
    <div className="stats-row"><Stat label="Live runs" value={snapshot.activeRuns.length} note="Preserved operational tabs" icon={Activity}/><Stat label="Saved watches" value={snapshot.watches.length} note="Scheduled + passive" icon={Radar}/><Stat label="Queue locks" value={snapshot.activeRuns.filter((run) => run.queueLocked).length} note="Navigation inhibited" icon={ShieldCheck}/><Stat label="Ledger entries" value={snapshot.history.length} note="Kept locally" icon={History}/></div>
    <SectionHead title="Live workspace" count={snapshot.activeRuns.length} action="View all" onAction={() => onNavigate("runs")}/>
    <div className="run-grid">{snapshot.activeRuns.length ? snapshot.activeRuns.slice(0, 4).map((run) => <RunCard key={run.id} run={run} expandedByDefault={snapshot.settings.expandRunsByDefault} onFocus={() => onFocus(run)} onEnd={() => onEnd(run)}/>) : <EmptyState type="runs" action={onNew}/>}</div>
  </div>;
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Activity }) { return <div className="stat-card"><Icon size={18}/><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong><small>{note}</small></div>; }
function SectionHead({ title, count, action, onAction }: { title: string; count: number; action?: string; onAction?: () => void }) { return <div className="section-head"><div><h2>{title}</h2><span>{count}</span></div>{action && <button onClick={onAction}>{action} <ChevronDown size={14}/></button>}</div>; }

function RunsPage({ snapshot, onAttach, onFocus, onEnd }: { snapshot: AppSnapshot; onAttach: () => void; onFocus: (run: Run) => void; onEnd: (run: Run) => void }) { return <div className="page"><PageHeader eyebrow="LIVE WORKSPACE" title="Every active page, one operational view." copy="QueueScope keeps parallel product pages independent while surfacing their safety state together." actions={<button className="button primary" onClick={onAttach}><Plus size={15}/>Attach tab</button>}/><div className="run-grid full">{snapshot.activeRuns.length ? snapshot.activeRuns.map((run) => <RunCard key={run.id} run={run} expandedByDefault={snapshot.settings.expandRunsByDefault} onFocus={() => onFocus(run)} onEnd={() => onEnd(run)}/>) : <EmptyState type="runs" action={onAttach}/>}</div></div>; }

function WatchesPage({ snapshot, activeIds, olderOpen, setOlderOpen, onNew, onEdit, onArm, onCopy, onDelete, onAutoStart }: { snapshot: AppSnapshot; activeIds: Set<string | undefined>; olderOpen: boolean; setOlderOpen: (open: boolean) => void; onNew: () => void; onEdit: (watch: Watch) => void; onArm: (watch: Watch) => void; onCopy: (watch: Watch) => void; onDelete: (watch: Watch) => void; onAutoStart: (watch: Watch) => void }) {
  const current = snapshot.watches.filter((watch) => !isOlderWatch(watch));
  const older = snapshot.watches.filter((watch) => isOlderWatch(watch));
  const card = (watch: Watch) => <WatchCard key={watch.id} watch={watch} active={activeIds.has(watch.id)} onArm={() => onArm(watch)} onCopy={() => onCopy(watch)} onEdit={() => onEdit(watch)} onDelete={() => onDelete(watch)} onAutoStart={() => onAutoStart(watch)}/>;
  return <div className="page"><PageHeader eyebrow="WATCH LIBRARY" title="Reusable instructions for each page." copy="Copy a watch, recur on selected weekdays, or leave a passive scout running without an attempt ceiling." actions={<button className="button primary" onClick={onNew}><Plus size={15}/>New watch</button>}/><SectionHead title="Live & upcoming" count={current.length}/><div className="watch-list">{current.length ? current.map(card) : <EmptyState type="watches" action={onNew}/>}</div>{older.length > 0 && <div className="older-section"><button onClick={() => setOlderOpen(!olderOpen)}><div><History size={16}/><strong>Older watches</strong><span>{older.length}</span></div><ChevronDown className={olderOpen ? "rotated" : ""} size={17}/></button>{olderOpen && <div className="watch-list">{older.map(card)}</div>}</div>}</div>;
}

function LabPage({ onOpen }: { onOpen: () => void }) { return <div className="page"><PageHeader eyebrow="QUEUE LAB" title="Rehearse the state machine before it matters." copy="The built-in synthetic page exercises detection, safety lock, position, ETA, and post-queue admission without touching a retailer."/><section className="lab-stage"><div className="lab-orbit"><span className="orbiter"/><div><FlaskConical size={34}/><strong>SAFE REHEARSAL</strong></div></div><div className="lab-copy"><span className="eyebrow">FIVE CONTROLLED STATES</span><h2>Product → queue → challenge → available → admitted</h2><p>Queue Lab runs entirely inside the extension. The queue state also carries a synthetic position and durable provider ETA.</p><div className="lab-steps">{["Product", "Queue", "Challenge", "Available", "Admitted"].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong></div>)}</div><button className="button primary" onClick={onOpen}><FlaskConical size={16}/>Launch Queue Lab</button></div></section><div className="principles-grid"><Principle icon={ShieldCheck} title="One-way safety lock" text="Queue or challenge evidence stops guarded navigation for the rest of the run."/><Principle icon={Gauge} title="Durable ETA" text="Provider ETA is stored as an absolute target, so the countdown does not reset on render."/><Principle icon={Bell} title="Attention, not automation" text="QueueScope alerts and focuses. It never checks out, purchases, or circumvents access controls."/></div></div>; }
function Principle({ icon: Icon, title, text }: { icon: typeof Activity; title: string; text: string }) { return <div><Icon/><strong>{title}</strong><p>{text}</p></div>; }

function ActivityPage({ snapshot }: { snapshot: AppSnapshot }) { return <div className="page"><PageHeader eyebrow="LOCAL LEDGER" title="A readable trail for every run." copy="Events are stored only in this browser profile and automatically bounded by your retention setting."/><div className="ledger">{snapshot.history.length ? snapshot.history.map((run) => <details key={run.id}><summary><span className="ledger-state">{run.outcome || run.state}</span><div><strong>{run.watchName}</strong><small>{new Date(run.createdAt).toLocaleString()} · {run.checkCount} checks</small></div><ChevronDown size={16}/></summary><div>{run.events.map((event) => <p key={event.id}><time>{new Date(event.at).toLocaleTimeString()}</time><span>{event.label}</span></p>)}</div></details>) : <EmptyState type="history"/>}</div></div>; }

function SettingsPage({ settings, onSave, onTone }: { settings: AppSettings; onSave: (settings: AppSettings) => void; onTone: (tone: ToneId) => void }) {
  const [draft, setDraft] = useState(settings);
  const toggle = (key: keyof AppSettings) => setDraft((value) => ({ ...value, [key]: !value[key] }));
  return <div className="page settings-page"><PageHeader eyebrow="PREFERENCES" title="Calibrate the console to your workflow." copy="All settings are stored locally and apply across the command center and side panel."/><section className="settings-card"><SettingHeading icon={Bell} title="Attention" copy="Decide when QueueScope asks for your attention."/><Toggle label="Browser notifications" copy="Notify on queue lock, availability, and admission." checked={draft.notificationsEnabled} onChange={() => toggle("notificationsEnabled")}/><Toggle label="Local notification sound" copy="Play a generated tone. No bundled audio or network request." checked={draft.soundEnabled} onChange={() => toggle("soundEnabled")}/><div className="setting-row"><div><strong>Sound profile</strong><span>Preview one of three locally generated tones.</span></div><div className="tone-picker">{(["signal", "soft", "urgent"] as ToneId[]).map((tone) => <button key={tone} className={draft.tone === tone ? "active" : ""} onClick={() => { setDraft({ ...draft, tone }); onTone(tone); }}><Volume2 size={14}/>{tone}</button>)}</div></div><Toggle label="Focus admitted tab" copy="Bring the preserved tab forward only after post-queue admission." checked={draft.focusOnAdmission} onChange={() => toggle("focusOnAdmission")}/></section>
    <section className="settings-card"><SettingHeading icon={SlidersHorizontal} title="Interface" copy="Tune density and default disclosure."/><Toggle label="Expand live cards by default" copy="Normally cards stay collapsed to keep parallel runs scannable." checked={draft.expandRunsByDefault} onChange={() => toggle("expandRunsByDefault")}/><div className="setting-row"><div><strong>Density</strong><span>Comfortable or compact operational cards.</span></div><select value={draft.density} onChange={(event) => setDraft({ ...draft, density: event.target.value as AppSettings["density"] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div><div className="setting-row"><div><strong>Motion</strong><span>Reduce ambient orbit and status animations.</span></div><select value={draft.motion} onChange={(event) => setDraft({ ...draft, motion: event.target.value as AppSettings["motion"] })}><option value="full">Full</option><option value="reduced">Reduced</option></select></div></section>
    <section className="settings-card"><SettingHeading icon={Clock3} title="History" copy="Control local retention and ETA alerts."/><div className="field-grid"><label>Retention days<input type="number" min="1" max="365" value={draft.retentionDays} onChange={(event) => setDraft({ ...draft, retentionDays: Number(event.target.value) })}/></label><label>Low ETA alert (minutes)<input type="number" min="1" max="60" value={draft.queueEtaAlertMinutes} onChange={(event) => setDraft({ ...draft, queueEtaAlertMinutes: Number(event.target.value) })}/></label></div></section><div className="sticky-save"><button className="button primary" onClick={() => onSave(draft)}>Save settings</button></div></div>;
}
function SettingHeading({ icon: Icon, title, copy }: { icon: typeof Activity; title: string; copy: string }) { return <div className="setting-heading"><Icon/><div><h2>{title}</h2><p>{copy}</p></div></div>; }
function Toggle({ label, copy, checked, onChange }: { label: string; copy: string; checked: boolean; onChange: () => void }) { return <label className="setting-row toggle"><div><strong>{label}</strong><span>{copy}</span></div><input type="checkbox" checked={checked} onChange={onChange}/></label>; }

function AttachDialog({ tabs, busy, onClose, onAttach }: { tabs: AttachableTab[]; busy: boolean; onClose: () => void; onAttach: (tab: AttachableTab) => void }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="modal" role="dialog" aria-modal="true"><header><div><span className="eyebrow">OBSERVE ONLY</span><h2>Attach an open tab</h2><p>QueueScope will not navigate or refresh an attached tab.</p></div><button className="icon-button" onClick={onClose}><X size={18}/></button></header><div className="tab-list">{tabs.length ? tabs.map((tab) => <button key={tab.id} disabled={busy || tab.attached} onClick={() => onAttach(tab)}><div className="tab-favicon">{new URL(tab.url).hostname.slice(0, 1).toUpperCase()}</div><div><strong>{tab.title}</strong><span>{new URL(tab.url).hostname}</span></div><span>{tab.attached ? "Attached" : "Attach"}</span></button>) : <EmptyState type="runs"/>}</div><div className="modal-note"><ShieldCheck size={15}/>Attached tabs use the default neutral Queue Lab signals until you save a custom watch.</div></section></div>; }

function PanelContent({ page, snapshot, activeIds, olderOpen, setOlderOpen, setPage, onFocus, onEnd, onArm, onCopy, onDelete, onAutoStart }: { page: Page; snapshot: AppSnapshot; activeIds: Set<string | undefined>; olderOpen: boolean; setOlderOpen: (open: boolean) => void; setPage: (page: Page) => void; onFocus: (run: Run) => void; onEnd: (run: Run) => void; onArm: (watch: Watch) => void; onCopy: (watch: Watch) => void; onDelete: (watch: Watch) => void; onAutoStart: (watch: Watch) => void }) {
  if (page === "activity") return <><div className="panel-tabs"><PanelTabs page={page} setPage={setPage}/></div><div className="panel-section"><SectionHead title="Activity" count={snapshot.history.length}/>{snapshot.history.length ? snapshot.history.slice(0, 20).map((run) => <div className="panel-ledger" key={run.id}><span>{run.outcome || run.state}</span><strong>{run.watchName}</strong><small>{new Date(run.createdAt).toLocaleString()}</small></div>) : <EmptyState type="history"/>}</div></>;
  if (page === "watches") { const current = snapshot.watches.filter((watch) => !isOlderWatch(watch)); const older = snapshot.watches.filter(isOlderWatch); const card = (watch: Watch) => <WatchCard key={watch.id} watch={watch} active={activeIds.has(watch.id)} onArm={() => onArm(watch)} onCopy={() => onCopy(watch)} onEdit={() => void send({ type: "OPEN_DASHBOARD" })} onDelete={() => onDelete(watch)} onAutoStart={() => onAutoStart(watch)}/>; return <><div className="panel-tabs"><PanelTabs page={page} setPage={setPage}/></div><div className="panel-section"><SectionHead title="Watches" count={current.length}/>{current.map(card)}{!current.length && <EmptyState type="watches" action={() => void send({ type: "OPEN_DASHBOARD" })}/>} {older.length > 0 && <div className="older-section panel-older"><button onClick={() => setOlderOpen(!olderOpen)}><div><History size={15}/><strong>Older</strong><span>{older.length}</span></div><ChevronDown className={olderOpen ? "rotated" : ""} size={16}/></button>{olderOpen && older.map(card)}</div>}</div></> }
  return <><div className="panel-tabs"><PanelTabs page={page} setPage={setPage}/></div><div className="panel-section"><SectionHead title="Live" count={snapshot.activeRuns.length}/><div className="run-grid">{snapshot.activeRuns.length ? snapshot.activeRuns.map((run) => <RunCard key={run.id} run={run} expandedByDefault={snapshot.settings.expandRunsByDefault} onFocus={() => onFocus(run)} onEnd={() => onEnd(run)}/>) : <EmptyState type="runs" action={() => void send({ type: "OPEN_DASHBOARD" })}/>}</div></div></>;
}
function PanelTabs({ page, setPage }: { page: Page; setPage: (page: Page) => void }) { return <>{panelNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon size={16}/>{item.label.replace("Live runs", "Live")}</button>; })}</>; }
function MobileBar({ items, page, setPage }: { items: typeof nav; page: Page; setPage: (page: Page) => void }) { return <nav className="mobile-bar">{items.slice(0, 5).map((item) => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon size={17}/><span>{item.label.split(" ")[0]}</span></button>; })}</nav>; }
