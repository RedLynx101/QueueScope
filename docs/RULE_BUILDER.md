# Rule builder guide

QueueScope intentionally ships without site-specific rules. A watch describes visible signals on the page you choose.

## Rule priority

The classifier evaluates signals in this order:

1. challenge phrase;
2. queue phrase;
3. admitted phrase, only if the run already holds a queue lock;
4. enabled availability selector;
5. unavailable phrase;
6. generic loaded product page;
7. unknown.

Challenge and queue states engage the navigation safety lock. Availability asks for attention but never clicks. Admission without earlier queue evidence is ignored as a product-page observation, which prevents phrases such as “wait until admitted” from becoming false positives.

## Text phrases

Enter one phrase per line. QueueScope lowercases and trims each value, removes duplicates, keeps at most 20 values per category, and limits each phrase to 120 characters. Prefer a distinctive visible sentence over a broad word such as `ready` or `line`.

## Availability selector

The selector should identify the enabled action or visible state that means availability. A match is ignored when the element has `disabled` or `aria-disabled="true"`. Selectors are limited to 200 characters and validated before save.

Example for a synthetic page:

```css
[data-queuescope-available='true']
```

QueueScope does not click the element.

## Position pattern

Use a case-insensitive regular expression whose first capture group is the numeric position. For example:

```regex
position\s+(\d+)
```

Commas are removed before numeric parsing. Values outside `0..1,000,000,000` remain unknown.

## ETA pattern

The first capture group may contain `HH:MM:SS`, a minute label, or a second label:

```regex
estimated wait\s+(\d{2}:\d{2}:\d{2})
```

QueueScope converts the duration to an absolute `providerEtaAt` timestamp when observed. The UI counts down from that timestamp rather than restarting the duration on every render.

## Conservative setup

- Use observe-only mode while developing a rule.
- Attach to a harmless synthetic/local page first.
- Confirm the phrase is visible, distinctive, and stable.
- Prefer several precise variants over one broad substring.
- Never encode credentials, cookies, tokens, ticket identifiers, or private response data in a watch.
- If a live queue has already appeared, attach the tab rather than creating a guarded-refresh watch.
