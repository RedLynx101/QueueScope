# v0.1.1 test report

Date: 2026-08-10  
Environment: Windows, Node.js 24.11.1, disposable Chromium profile, 1440×1000 dashboard, 420×840 side panel.

## Automated gates

| Gate | Result |
|---|---|
| ESLint | Pass, zero warnings |
| TypeScript `--noEmit` | Pass |
| Unit tests | 26/26 pass across rules, schedules, state machine, and validation |
| Production MV3 build | Pass |
| Artifact verification | Pass, 20 required/self-contained release files |
| Chromium unpacked-extension E2E | Pass |
| Dependency audit | 0 known vulnerabilities |

## Browser assertions

- Loaded the production `dist` folder in a new temporary Chromium profile.
- Opened the dashboard with tab title `QueueScope`.
- Confirmed the dashboard and standalone Queue Lab render the packaged `/icons/icon-128.png` asset at its canonical 128×128 intrinsic dimensions.
- Confirmed the Queue Lab orbit marker remained within 3 CSS pixels of the orbit radius.
- Opened the synthetic Queue Lab and transitioned from product to queue.
- Persisted classification `queue`, position `428`, and provider ETA `00:08:30`.
- Confirmed `queueLocked: true` and browser tab `autoDiscardable: false`.
- Confirmed live cards begin collapsed in command center and side panel.
- Expanded the live run and rendered timing, evidence, position, ETA, and actions.
- Transitioned to admitted and confirmed the run reached `ADMITTED` only after queue lock.
- Confirmed side-panel footer was pinned to the viewport bottom.
- Seeded a future watch in the side panel, toggled auto-start, copied it as a paused watch, and deleted the copy.
- Opened the watch builder and confirmed passive mode displays no attempt ceiling.
- Captured browser-generated release screenshots without console/page errors, with side-panel header and footer geometry asserted before capture.

## Manual visual review

Reviewed command center, expanded live run, Queue Lab overview, Queue Lab waiting state, watch builder, and both 420×840 side-panel states at original resolution. Verified canonical icon consistency, hierarchy, no clipped status indicators, collapsed-card density, complete panel headers, pinned panel footers, and responsive orbit alignment. The screenshots tracked in `assets/screenshots` are the reviewed release captures.

## Boundaries

The E2E uses only the extension's synthetic Queue Lab. No assertion in this report claims compatibility with an external website or future page markup.
