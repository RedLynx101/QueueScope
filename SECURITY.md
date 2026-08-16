# Security policy

## Supported versions

Security fixes are provided for the latest `0.1.x` alpha until a newer release line replaces it.

## Reporting a vulnerability

Use GitHub private vulnerability reporting. Do not open a public issue containing credentials, tokens, queue identifiers, private page captures, or session material.

Include the affected version, browser/version, reproduction steps using synthetic data where possible, security impact, and any suggested mitigation. Please allow a reasonable remediation window before public disclosure.

## High-priority scope

- Browser-permission escalation.
- Credential, cookie, session, or browsing-data exposure.
- Remote-code execution or unexpected network transmission.
- Unsafe guarded refresh after configured queue or challenge evidence.
- Admission without prior queue evidence.
- Cross-origin observation outside a user-granted permission.
- Leakage or corruption of locally stored watch/run history.
- An extension action that becomes consequential on the observed page.

General feature requests and rule-authoring questions belong in normal GitHub issues.
