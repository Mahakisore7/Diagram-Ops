# ADR-0006: Requests for another user's diagram return 404, not 403

**Status:** Accepted

## Context
`FR-D7` requires that a user can only read, update, or delete their own diagrams. When a request targets a valid ID owned by someone else, the API must respond somehow.

## Decision
Return `404 NOT_FOUND` — identical to the response for an ID that doesn't exist at all.

## Alternatives considered
- **Return `403 FORBIDDEN`.** More "technically accurate," but confirms the resource exists. An attacker can then enumerate valid diagram IDs by noting which return `403` (exists, not theirs) versus `404` (doesn't exist) — an information leak. This is a named category: [OWASP API1:2023 — Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).

## Consequences
Both "doesn't exist" and "exists but isn't yours" are indistinguishable from outside the system. Slightly less precise error messages for legitimate debugging, in exchange for closing an enumeration vector.
