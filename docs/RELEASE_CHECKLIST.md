# v0.1.0 release checklist

## Source and trust boundary

- [x] Independent repository and history.
- [x] No operational repository remote/submodule.
- [x] Retailer-neutral source, tests, fixtures, screenshots, and documentation.
- [x] No captured provider response, private endpoint, product identifier, credential, cookie, or session material.
- [x] No username or local absolute path in tracked product files.

## Product and safety

- [x] No cart, checkout, challenge-solving, queue-bypass, proxy, fingerprint, or identity automation.
- [x] Optional page-origin access requested on arm/attach.
- [x] No cookie or browsing-history permission.
- [x] Queue/challenge evidence engages a monotonic navigation lock.
- [x] Admission requires prior queue evidence.
- [x] Unknown position and ETA remain unknown.
- [x] Queue-locked tabs are protected from discard.

## Quality

- [x] `npm run check` passes.
- [x] 26/26 unit tests pass.
- [x] Production artifact verifier passes.
- [x] Disposable-profile unpacked-extension E2E passes.
- [x] Side panel reviewed at 420×840.
- [x] Screenshots regenerated from v0.1.0 and manually reviewed.
- [x] Dependency audit reports zero vulnerabilities.
- [x] Security, CSP, permissions, secret, and neutrality reviews complete.

## Repository handoff

- [x] MIT license present.
- [x] CI workflow present.
- [x] Release archive and SHA-256 generated.
- [x] README install, usage, safety, and validation instructions current.
- [x] Repository remains private.
- [ ] Owner changes visibility to public.
- [ ] Owner checks anonymous README/images and enables desired repository settings.
