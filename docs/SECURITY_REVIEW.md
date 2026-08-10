# v0.1.0 security review

Date: 2026-08-10

## Reviewed surface

- Manifest V3 permissions and Content Security Policy.
- Runtime message allowlist and sender checks.
- URL, schedule, settings, selector, pattern, and observation bounds.
- Content observer capabilities and data flow.
- Guarded-refresh decision and queue-lock monotonicity.
- Extension-local storage and restart recovery.
- Notification/offscreen-audio path.
- Built assets for remote requests and dynamic code execution.
- Dependencies, secrets, retailer-specific content, absolute local paths, and Git history.

## Findings

No release-blocking finding remains.

- Arbitrary HTTP(S) access is optional; localhost alone is granted for development.
- The extension has no cookie or history permission and no backend/telemetry path.
- Runtime messages are structurally allowlisted. Normal observations require a content-script tab sender; synthetic Lab observations require the extension-owned harness URL.
- URLs are limited to HTTP(S), credentials/fragments are removed, and common tracking parameters are stripped.
- Rules and evidence are bounded. Suspicious nested-quantifier patterns and invalid/complex selectors are rejected.
- Queue/challenge evidence permanently inhibits navigation for the run. Admission requires the existing lock.
- Built assets contain no remote executable/data request and no `eval`/`Function` construction.
- `npm audit` reports zero known vulnerabilities.

## Residual risks

- Visible page markup can change, creating false negatives or ambiguous signals. Users should prefer observe-only while validating rules.
- Regular-expression safety uses conservative structural checks rather than a formal complexity proof; input length and observed text are bounded to constrain impact.
- `tabs` is a powerful permission required for preserved-tab coordination and attachment. It is documented, and page observation still requires optional host access.
- Developer-mode installation lacks store review and automatic update guarantees.

The release remains an alpha and does not claim compatibility with any specific external site.
