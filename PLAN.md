# QueueScope public-release plan

## Objective

Ship and maintain a real, installable, retailer-neutral QueueScope alpha without publishing site-specific integrations, production captures, private queue research, or operational repository history.

## Trust boundary

- The operational build remains in a separate private repository.
- This repository has independent history and no operational remote or submodule.
- The public core contains generic scheduling, visible-DOM rules, a safety state machine, and synthetic Queue Lab only.
- No retailer names, domains, selectors, product identifiers, captured responses, provider endpoints, credentials, cookies, or session data cross the boundary.
- QueueScope assists observation and attention; consequential actions stay human-controlled.

## v0.1.0 completed scope

- [x] Manifest V3 extension with full command center and compact side panel.
- [x] Scheduled and passive watch profiles.
- [x] One-time, daily, weekday, weekend, and custom-weekday recurrence.
- [x] Start, expected, and stop times with baseline/fast cadence windows.
- [x] No attempt ceiling inside a valid window or passive run.
- [x] Guarded-refresh and observe-only modes.
- [x] Per-origin optional host permission requested on arm/attach.
- [x] Parallel run model with one preserved tab per watch.
- [x] Attach to an already-open tab without navigation.
- [x] Generic visible-text, CSS-selector, position-pattern, and ETA-pattern rules.
- [x] Monotonic queue/challenge navigation lock.
- [x] Admission requires prior queue evidence.
- [x] Absolute provider ETA and local countdown.
- [x] Non-discardable queue-locked tabs and restart rehydration.
- [x] Local notifications and generated audio profiles.
- [x] Copy/edit/delete/arm controls and collapsed older-watch shelf.
- [x] Collapsed live cards with timing, evidence, position, ETA, and tab actions.
- [x] Settings for card expansion, density, motion, sounds, retention, and ETA alert.
- [x] Queue Lab product, queue, challenge, available, and admitted rehearsal.
- [x] MIT license, CI, unit tests, real extension E2E, package verification, and release archive.
- [x] Fresh E2E screenshots manually reviewed at desktop and side-panel sizes.
- [x] Public README, architecture, rule guide, privacy contract, security review, test report, and release checklist.

## Verified product invariants

1. Configured queue or challenge evidence prevents another guarded refresh for that run.
2. A page cannot become admitted without previous queue/challenge lock evidence.
3. An attached tab is observe-only and never navigated by QueueScope.
4. Provider ETA is stored as an absolute target, so UI rerenders do not restart it.
5. Unknown position or timing remains `Not exposed` / `—`; it is never coerced to zero.
6. Queue-locked tabs are protected from background discard until the user ends the run.
7. Runtime messages, evidence, selectors, regular expressions, URLs, and settings are bounded.
8. The extension has no purchase, checkout, challenge-solving, credential, cookie, history, remote-code, or telemetry capability.

## Publication gate

- [x] Fresh public-intended history only.
- [x] No operational remote or submodule.
- [x] No site-specific source, fixtures, screenshots, URLs, or identifiers.
- [x] No local absolute paths or usernames in tracked product files.
- [x] Dependency audit reports zero known vulnerabilities.
- [x] Secrets and remote-code patterns scanned.
- [x] Manifest permissions and CSP reviewed against implementation.
- [x] Lint, TypeScript, 26 unit tests, build, artifact verification, and E2E pass.
- [x] Clean disposable browser profile validates the unpacked extension.
- [x] Side panel reviewed at 420×840 with pinned footer and collapsed run.
- [x] README screenshots regenerated from the release build and reviewed.
- [x] MIT license selected and present.
- [x] Repository is public.
- [x] Anonymous README, images, release assets, and repository settings reviewed after publication.

## Post-alpha roadmap (not a publication blocker)

- Export/import portable watch definitions.
- Visual element picker and live rule highlighting.
- Multi-resource and shared-origin Queue Lab scenarios.
- Storage schema migrations and richer outcome analytics.
- Cross-platform packaging scripts.
- Accessibility audit with external assistive-technology testing.
- Optional adapter SDK after its capability boundary has a separate security review.
- Chrome Web Store packaging only after developer-mode field feedback.
