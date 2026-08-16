# Contributing

QueueScope welcomes retailer-neutral fixes, tests, documentation, accessibility work, and capability-bounded generic features.

## Local setup

```powershell
npm ci
npm run check
```

Useful commands:

- `npm run dev` — Vite UI preview.
- `npm run test:watch` — focused unit tests.
- `npm run build` — production MV3 build plus artifact verification.
- `npm run test:e2e` — load the extension in a disposable visible Chromium profile.
- `npm run package` — create the unpacked release ZIP and SHA-256 file.

## Change requirements

- Keep the core retailer-neutral.
- Preserve the privacy and automation boundaries.
- Add or update tests for state/schedule/rule changes.
- Use only synthetic fixtures committed to this repository.
- Include fresh browser screenshots for meaningful UI changes and inspect them at full resolution.
- Do not commit captured production pages, private responses, credentials, cookies, session material, product identifiers, or provider endpoints.
- Explain new permissions and keep origin access optional.
- Do not weaken the queue-lock or prior-queue admission invariants.

Run `npm run check` before opening a pull request. UI changes should also pass `npm run test:e2e` on Windows or document why the visible-browser gate could not run.
