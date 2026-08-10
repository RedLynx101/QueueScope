# Changelog

## 0.1.1 — 2026-08-10

Presentation consistency patch for the public-ready repository.

- Replaced the command center, side panel, boot state, and Queue Lab CSS logo approximations with the canonical transparent QueueScope app icon.
- Added browser assertions that verify both application surfaces load the packaged 128×128 icon asset.
- Regenerated and manually reviewed every tracked extension screenshot, including fresh 420×840 side-panel captures with the full header and footer visible.

## 0.1.0 — 2026-08-10

First public-ready developer-mode alpha.

- Added local-first MV3 service worker, schedule engine, rule classifier, run state machine, storage, tab preservation, notifications, and generated audio.
- Added scheduled/recurring and passive watch profiles, guarded-refresh/observe-only modes, optional per-origin access, watch copy, and automatic schedule start.
- Added command center, live workspace, watch builder, activity ledger, Queue Lab, settings, and compact side panel.
- Added queue/challenge navigation lock, prior-queue admission guard, position/ETA extraction, durable absolute ETA, low-ETA notification, and background-discard protection.
- Added synthetic Queue Lab, 26 unit tests, real extension E2E, CI, package verification, release packaging, and public documentation.
