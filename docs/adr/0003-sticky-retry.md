# ADR-0003: Retry on bad output stays on the same provider ("sticky retry")

**Status:** Accepted

## Context
A provider can return a response that parses as JSON but has Mermaid syntax that doesn't match its declared `diagramType` (`FR-G4`). This is a formatting problem, not a provider failure — the provider is reachable and responding.

## Decision
On a syntax mismatch, retry once against **the same provider that produced the bad output**, with a corrective instruction appended. Never re-enter the provider fallback cascade (ADR-0002) for this reason.

## Alternatives considered
- **Retry through the normal fallback path.** A single malformed Groq response would silently escalate to the paid Claude provider — turning a free-tier formatting hiccup into real spend, and doing so invisibly.

## Consequences
A formatting glitch costs one extra free-tier call, not a paid one. This is the specific mechanism, tested in `tests/stickyRetry.test.js`, that keeps the failure mode in ADR-0002 from quietly becoming expensive.
