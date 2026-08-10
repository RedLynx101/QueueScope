# QueueScope public repository plan

## Objective

Build a technically real, installable, and visually strong public QueueScope repository without publishing retailer-specific integrations, captured production data, private queue behavior, or operational implementation history.

The repository begins private. Public visibility is a manual owner decision after the final release audit.

## Repository separation

QueueScope uses two independent repositories with different trust boundaries.

| Repository | Visibility | Responsibility |
|---|---|---|
| Operational QueueScope | Private | Complete working extension, site-specific adapters, production research, and operational fixtures |
| QueueScope | Private during development; public only after owner approval | Generic core, adapter SDK, synthetic demonstrations, documentation, reviewed screenshots, and public releases |

Rules:

1. The public repository has fresh Git history.
2. The operational repository is never added as a Git remote or submodule.
3. Code moves across the boundary only through a reviewed clean-room extraction.
4. Retailer names, domains, selectors, item identifiers, provider endpoints, captured responses, and queue identifiers are not copied.
5. Public screenshots must show neutral Queue Lab or empty-workspace states only.
6. The owner manually changes repository visibility after the publication checklist passes.

## Product thesis

QueueScope is a local-first browser operations console for scheduled page observation and virtual-queue awareness. It turns inconsistent visible webpage signals into a durable run state, coordinates refresh safely, preserves sensitive tabs, records evidence, and brings the human back when attention is useful.

It assists observation and coordination. It does not automate purchases or circumvent access controls.

## Public feature scope

### Command center

- Overview with current posture, active runs, upcoming watches, passive monitors, and recent outcomes.
- Live Runs workspace with collapsed-by-default run cards and an expandable evidence timeline.
- Watches library with copy, edit, delete, arm, pause, and per-watch auto-start controls.
- Passive Monitors for long-horizon observation without a fixed event window.
- Insights for local run history, observed timing, and outcome summaries.
- Queue Lab for deterministic rehearsals.
- Settings for notifications, sounds, motion, density, history retention, and queue-alert thresholds.

### Scheduling

- One-time schedules.
- Daily schedules.
- Weekday and weekend schedules.
- Custom weekday selection.
- Optional start and end dates for recurring schedules.
- Explicit monitoring start and stop times.
- Optional expected-event time.
- Baseline cadence.
- High-attention cadence before and after the expected event.
- Jitter within user-defined bounds.
- No arbitrary attempt ceiling inside a valid schedule.

### Run coordination

- One preserved tab per independent watched resource.
- Parallel runs on the same origin when their resource identities differ.
- Per-origin refresh serialization to prevent reload bursts.
- Per-run safety locks for resource-specific queues.
- Origin-wide safety locks for shared challenges or rate limits.
- Tab focus and explicit end-run actions.
- Background discard protection after a queue-sensitive state is detected.
- Observer recovery after extension restart without automatic navigation.

### Generic observation

- URL-pattern matching.
- Visible-text rules.
- CSS-selector presence rules.
- Attribute and enabled/disabled-state rules.
- Regex-based position and duration extraction.
- Queue-entry, waiting, attention, admitted, expired, unavailable, and available states.
- Evidence confidence and provenance.
- Absolute provider timestamps when available.
- Explicit unknown values when the page does not expose a signal.

### Attention and history

- Desktop notifications.
- Optional local notification sounds.
- Configurable near-admission threshold.
- Focus-on-admission preference.
- Local event timeline.
- Position and ETA samples.
- Outcome history with configurable retention.
- Export and import of neutral watch definitions.

## Explicit non-goals

The public project will not include:

- Automatic cart actions or checkout.
- CAPTCHA solving or challenge automation.
- Queue bypassing or multiple queue-entry creation.
- Proxy rotation, fingerprint spoofing, or identity manipulation.
- Credential, cookie, or session-token extraction.
- Undocumented provider API calls.
- Retailer-specific hidden endpoints.
- Site-specific purchase automation.
- Claims that a queue position necessarily equals people ahead.

## Architecture

### Planned workspace

```text
queuescope/
├── apps/
│   ├── extension/
│   └── demo-lab/
├── packages/
│   ├── core/
│   ├── adapter-sdk/
│   ├── generic-dom-adapter/
│   ├── scheduling/
│   ├── storage/
│   ├── telemetry/
│   └── ui/
├── examples/
│   ├── product-event/
│   ├── virtual-queue/
│   └── multi-resource-event/
├── assets/
│   └── screenshots/
├── docs/
└── tests/
```

### Generic adapter contract

The public SDK should make capabilities explicit rather than allow arbitrary privileged behavior.

```ts
interface QueueScopeAdapter {
  id: string;
  version: string;
  match(context: PageContext): MatchResult;
  observe(context: ReadonlyPageContext): Observation;
  capabilities: {
    readsVisibleDom: boolean;
    supportsGuardedRefresh: boolean;
    supportsPosition: boolean;
    supportsProviderEta: boolean;
    supportsAvailability: boolean;
  };
}
```

An adapter returns observations. It cannot purchase, solve challenges, issue private network requests, or silently expand its host permissions.

### Observation model

Every observation should contain:

- Observation timestamp.
- Canonical page URL with tracking parameters removed.
- Adapter identifier and version.
- Classification.
- Confidence.
- Human-readable evidence.
- Optional resource identity.
- Optional position and position label.
- Optional absolute provider ETA.
- Optional availability state.
- Optional queue phase.
- Safety-lock recommendation.

Provider ETA values should be stored as absolute timestamps. The UI derives a local countdown so rerenders do not reset the estimate. New provider timestamps may replace old ones only when their provenance is at least as authoritative.

## Generic visual rule builder

The primary public integration surface should be a visual rule builder opened from **Create watch from this tab**.

Initial rule types:

- Element exists or disappears.
- Exact text appears or disappears.
- Element becomes enabled or disabled.
- Attribute changes.
- Text matches a regular expression.
- Position is extracted from a capture group.
- Duration or timestamp is extracted from a capture group.
- A safety-lock signal appears.
- An admitted-state signal appears after a prior queue lock.

The builder should provide:

- Live preview against the current tab.
- Highlighting of the matched element.
- A plain-language explanation of the rule.
- A raw JSON editor for advanced users.
- Validation before saving.
- Portable import and export.
- A permission summary before activation.

## Queue Lab

Queue Lab is both a product feature and the public demonstration environment.

Synthetic scenarios:

1. Product page before an event.
2. Availability transition.
3. Waiting room with position and provider ETA.
4. Queue state that forbids refresh.
5. Challenge or rate-limit safety lock.
6. Admission transition.
7. Purchase-window timer without purchase automation.
8. Expired session.
9. Several independent resources on one origin.
10. Shared-origin challenge affecting several runs.

The demo must run entirely on localhost and must be included in automated E2E coverage.

## Design direction

### Visual thesis

A dark operational instrument panel with restrained mint signal lighting, dense but legible typography, and state transitions that feel like a live control room rather than a marketing dashboard.

### Content plan

1. The command center leads with system posture and active attention.
2. Live Runs explains the current state, evidence, timing, and next human action.
3. Queue Lab proves safety behavior without external traffic.
4. The side panel compresses the same operational model without losing critical detail.

### Interaction thesis

- Short staged entrances establish hierarchy without delaying operation.
- State changes use restrained signal pulses and shared-layout transitions.
- Expand/collapse, drawers, and hover explanations clarify dense settings while respecting reduced-motion preferences.

### Visual constraints

- One mint action/state accent.
- Two typefaces maximum.
- Cards only when the card is an interaction or independent run.
- Live-run cards collapsed by default with a persistent user preference.
- No decorative dashboard-card mosaic.
- Side panel must remain usable at 400–420 CSS pixels.
- All screenshots must be captured after animations settle and the viewport resets to the top.

## Privacy and permission model

- Local-first storage by default.
- No cloud account requirement.
- Optional host permission requested per origin when the user creates or arms a watch.
- No broad host access on first install unless technically unavoidable and explicitly justified.
- No cookie permission.
- No browsing-history permission.
- No remote code execution.
- No analytics or telemetry in the first public release.
- Export is a deliberate user action.
- Stored URLs are canonicalized and tracking parameters removed.
- Evidence strings are bounded and sanitized.

## Test strategy

### Unit tests

- Schedule calculation across time zones and daylight-saving boundaries.
- Recurring schedule normalization.
- Run-state transitions.
- Queue-lock monotonicity.
- Refresh authorization and per-origin coordination.
- Absolute provider ETA behavior.
- Position parsing and unknown-state handling.
- Generic rule validation.
- URL canonicalization and tracking-parameter removal.
- Runtime-message validation.
- Snapshot migration.

### Integration tests

- Extension storage and service-worker restart.
- Observer reinjection.
- Optional host-permission request and revocation.
- Multi-tab run isolation.
- Side-panel and command-center state synchronization.
- Notifications and local sound playback.

### Real extension E2E

- Load the production build as an unpacked Manifest V3 extension.
- Confirm a stable extension identity in the deterministic test build.
- Exercise every Queue Lab transition.
- Verify guarded refresh stops before another reload after safety evidence.
- Verify queue-sensitive tabs become non-discardable.
- Verify live-run cards start collapsed on both surfaces.
- Verify the compact side panel at its target width.
- Verify recurring watch creation, copy, auto-start, and deletion.
- Capture and manually review release screenshots.

## Implementation phases

### Phase 0 — Repository and trust boundary

- [x] Keep the operational source in a separate private repository.
- [x] Start the showcase repository with fresh history.
- [x] Add public-safe screenshots from the live tested prototype.
- [x] Document the architecture and safety boundary.
- [ ] Select the final open-source license.
- [ ] Add repository topics and social preview image.

Exit criterion: the repository contains no retailer-specific source, URLs, fixtures, or private history.

### Phase 1 — Generic core extraction

- [ ] Reimplement the schedule model in the new repository.
- [ ] Reimplement the run state machine.
- [ ] Reimplement refresh authorization and safety locks.
- [ ] Reimplement storage schemas and migrations.
- [ ] Add unit tests before UI integration.

Exit criterion: generic Queue Lab state transitions pass without browser-specific code.

### Phase 2 — Adapter SDK

- [ ] Define the adapter interface and capability declaration.
- [ ] Implement bounded visible-DOM observation helpers.
- [ ] Implement evidence sanitization.
- [ ] Add adapter conformance tests.
- [ ] Publish example adapter definitions using only synthetic pages.

Exit criterion: a third party can create a safe adapter without changing the core state machine.

### Phase 3 — Extension runtime

- [ ] Create the Manifest V3 service worker.
- [ ] Add optional per-origin permissions.
- [ ] Add observer injection and recovery.
- [ ] Add preserved-tab management.
- [ ] Add side-panel registration.
- [ ] Add local notification and offscreen-audio support.

Exit criterion: the extension completes the Queue Lab journey after a service-worker restart.

### Phase 4 — Public command center

- [ ] Port the neutral design system.
- [ ] Build Overview, Live Runs, Watches, Passive Monitors, Insights, Queue Lab, and Settings.
- [ ] Build the compact side panel.
- [ ] Add the visual rule builder.
- [ ] Support comfortable and compact density.
- [ ] Support full and reduced motion.
- [ ] Verify keyboard and screen-reader operation.

Exit criterion: command-center and side-panel workflows pass E2E at desktop and compact widths.

### Phase 5 — Demonstration suite

- [ ] Build synthetic product-event fixture.
- [ ] Build virtual-queue fixture.
- [ ] Build multi-resource fixture.
- [ ] Add one-click Queue Lab presets.
- [ ] Record a 30–45 second public demonstration.
- [ ] Capture final README screenshots and social preview.

Exit criterion: the entire value proposition can be demonstrated without external traffic.

### Phase 6 — Public hardening

- [ ] Run dependency, secret, and full-history scans.
- [ ] Review extension permissions against actual code paths.
- [ ] Add Content Security Policy checks.
- [ ] Add dependency update automation.
- [ ] Add CI for lint, types, unit tests, build, artifact verification, and E2E.
- [ ] Verify the packaged extension from a clean browser profile.
- [ ] Complete accessibility and reduced-motion review.

Exit criterion: every CI and manual release gate passes from a clean clone.

### Phase 7 — Owner review and publication

- [ ] Review the README as an outside visitor.
- [ ] Review every tracked image at full resolution.
- [ ] Confirm no retailer or provider appears in tracked text, source, image metadata, or Git history.
- [ ] Confirm repository visibility is still private.
- [ ] Choose and add the license.
- [ ] Create the first signed or annotated release tag.
- [ ] Prepare the release notes and demonstration video.
- [ ] Owner manually changes visibility to public.
- [ ] Verify the anonymous public view immediately afterward.

Exit criterion: the repository is public only after explicit owner approval and anonymous readback.

## Final publication checklist

The owner should not make the repository public until all items below are complete.

### Source and history

- [ ] Fresh history contains only public-intended files.
- [ ] No operational repository remote or submodule exists.
- [ ] Full-history secret scan passes.
- [ ] No retailer domains, names, selectors, item IDs, endpoints, or captured responses are present.
- [ ] No local absolute paths or usernames are present.

### Product and safety

- [ ] The extension never purchases or completes a consequential action.
- [ ] The extension does not bypass a queue or challenge.
- [ ] Optional permissions match documented behavior.
- [ ] Queue and challenge evidence always defeats refresh cadence.
- [ ] Unknown values remain visibly unknown.

### Quality

- [ ] Lint, types, unit tests, build, artifact verification, and E2E pass.
- [ ] Clean unpacked installation passes.
- [ ] Side panel is reviewed at 400–420 CSS pixels.
- [ ] Screenshots are current and visually reviewed.
- [ ] README links and image paths work from GitHub.
- [ ] Accessibility and reduced-motion checks pass.

### Repository settings

- [ ] Repository remains private until the owner approves publication.
- [ ] Default branch protection is configured.
- [ ] Secret scanning and dependency alerts are enabled where available.
- [ ] Issues, Discussions, and security reporting are configured intentionally.
- [ ] License is selected and present.
- [ ] Social preview and repository description are set.

## Decisions reserved for owner review

1. Final license: Apache-2.0 is recommended for portfolio visibility and adapter adoption; a source-available license is an alternative if commercial reuse should be restricted.
2. Whether to accept third-party adapters in the main repository or require separate packages.
3. Whether the first public release is a functional alpha or a documented architecture preview.
4. Whether to publish a Chrome Web Store listing or keep installation developer-only initially.
5. Whether anonymous local diagnostics should ever be added; the default recommendation is no telemetry.

