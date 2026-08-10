# Privacy and safety contract

QueueScope is designed as a local observation and attention tool.

## Data handling

- Configuration, observations, and history remain on the user's device by default.
- URLs are canonicalized and common tracking parameters are removed before storage.
- Evidence strings are bounded and sanitized.
- Queue identifiers, credentials, authorization values, cookies, and session tokens are not collected.
- No analytics or cloud telemetry is included in the initial public release.

## Browser permissions

- Request access only when the user creates or arms a watch for an origin.
- Explain the permission immediately before requesting it.
- Do not request cookie or browsing-history access.
- Do not load or execute remote code.
- Keep the extension Content Security Policy strict.

## Automation boundary

QueueScope may observe visible state, manage its own alarms, focus a preserved tab, issue local notifications, and perform a user-configured guarded refresh while no safety lock exists.

QueueScope must not:

- Add products to a cart or complete checkout.
- Solve or automate a challenge.
- Create multiple queue identities or attempt to bypass a queue.
- Rotate proxies or spoof browser identity.
- Extract credentials or session data.
- Call undocumented private provider endpoints.

## Safety precedence

Safety evidence always takes precedence over cadence. When a queue, challenge, rate limit, admission state, or purchase timer is detected, QueueScope stops guarded refresh for the affected scope before scheduling another reload.

## Honest uncertainty

The UI must distinguish:

- Provider position from locally inferred progress.
- Exact provider ETA from an upper bound or local estimate.
- A ticket identifier from a count of people ahead.
- Confirmed availability from an ambiguous page signal.
- Unknown data from zero.

