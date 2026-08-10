<p align="center">
  <img src="assets/queuescope-icon.png" width="96" alt="QueueScope icon">
</p>

# QueueScope

**A browser-native control plane for time-sensitive web events.**

QueueScope coordinates scheduled page watches, preserved browser tabs, queue-sensitive safety locks, state history, and human-facing alerts in one local workspace. The public edition is being rebuilt as a retailer-neutral platform with an adapter SDK and synthetic Queue Lab rather than shipping integrations tied to specific websites.

> Private preview. This repository is intentionally private while the generic architecture, permissions model, documentation, and release package are prepared for public review.

![QueueScope command center](assets/screenshots/command-center.png)

## What QueueScope is designed to do

- Schedule one-time, daily, weekday, weekend, and custom-day watches.
- Coordinate multiple independent tabs and page-level state machines.
- Shift between baseline, high-attention, and passive observation cadences.
- Stop automated refresh as soon as queue, challenge, admission, or other safety evidence appears.
- Preserve queue-sensitive tabs and keep the operator in control of any consequential action.
- Record local state transitions, provider timing, position evidence, and outcomes.
- Present the same operating picture in a full command center and compact browser side panel.
- Let users define page behavior through portable, retailer-neutral adapters and visual rules.

QueueScope is an observation and coordination tool. It is not an auto-checkout system, CAPTCHA solver, identity spoofer, queue bypass, proxy rotator, or purchasing bot.

## Live workspace

The screenshots below come from a real unpacked-extension E2E run, not static design mockups. The public repository uses only neutral Queue Lab states; site-specific fixtures and adapters remain private.

### Queue-aware live run

![QueueScope live run with queue lock](assets/screenshots/live-run.png)

### Compact side panel

![QueueScope side panel](assets/screenshots/side-panel.png)

### Queue Lab

Queue Lab is the deterministic local simulator used to prove product, queue, challenge, admission, and purchase-window transitions without generating external page traffic.

![QueueScope Queue Lab](assets/screenshots/queue-lab.png)

## Public architecture direction

The public edition will be organized around a small generic core and explicit capability boundaries:

```text
Browser UI
  -> watch scheduler
  -> run state machine
  -> refresh safety coordinator
  -> observation history
  -> adapter SDK
       -> generic DOM rules
       -> synthetic Queue Lab adapters
       -> user-authored local adapters
```

The default installation will not contain retailer-specific selectors, names, URLs, hidden endpoints, or captured production responses. Access to arbitrary pages will use optional host permissions granted by the user for an individual origin.

## Repository status

This repository currently contains the public-facing plan, architecture boundary, safety contract, and reviewed visual evidence. Implementation will proceed phase by phase after the private review gate.

- [Implementation plan](PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy and safety contract](docs/PRIVACY_AND_SAFETY.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

The operational site-specific build is maintained separately in a private repository and will not be merged into this history.

## Public-release gate

Do not change this repository to public until every item in the final publication checklist in [PLAN.md](PLAN.md) has been verified, including a full-history secret scan, retailer-neutrality audit, permission review, clean installation test, and visual inspection.
