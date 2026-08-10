# Privacy and safety contract

QueueScope is a local observation and attention tool.

## Data handling

- Watches, observations, active runs, settings, and history stay in `chrome.storage.local`.
- Common campaign parameters and URL fragments are removed before a saved URL is stored.
- Page text is processed in the page and is not retained wholesale; only bounded evidence is sent to the extension.
- Credentials, authorization values, cookies, session tokens, provider responses, and browser history are not collected.
- There is no account, analytics, cloud synchronization, telemetry, or remote backend.

## Browser permissions

- HTTP(S) host access is optional and requested for one origin when the user arms or attaches a page.
- QueueScope does not declare a global content script; it injects the observer only into active, authorized run tabs.
- Cookie and browsing-history permissions are absent.
- Extension pages use a strict self-only Content Security Policy.
- Audio is generated locally with the Web Audio API.

## Automation boundary

QueueScope may read visible page text, evaluate user-authored visible-DOM rules, manage its own alarms, perform a configured guarded refresh while the run is safe, focus a preserved tab, prevent discard of a queue-sensitive tab, and issue local alerts.

QueueScope does not:

- click purchase or cart controls;
- complete checkout;
- click through a waiting room or hold a spot;
- solve or automate a challenge;
- create multiple identities or bypass a queue;
- rotate proxies or spoof browser identity;
- read credentials, cookies, or session data;
- call undocumented provider endpoints;
- claim that a position identifier equals people ahead.

## Safety precedence

Configured queue or challenge evidence engages a monotonic navigation lock. Once locked, that run cannot refresh again until the user ends it. Availability enters an attention state without clicking. Admission is valid only after prior queue evidence.

The page-specific rules are user-authored. A false negative is possible if a site changes its visible text or markup, so observe-only mode is the conservative option for already-live or sensitive tabs.

## Honest uncertainty

The UI distinguishes provider-exposed position from unknown position, an absolute provider ETA from no ETA, a visible availability signal from an ambiguous product page, and unknown values from zero.
