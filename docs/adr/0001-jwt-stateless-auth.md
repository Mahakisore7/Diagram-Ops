# ADR-0001: JWT for authentication instead of server-side sessions

**Status:** Accepted

## Context
The backend needs to know which user is making a request, for ownership checks (`FR-D7`) and rate limiting. It will run as multiple replicas behind a load balancer (`NFR-SC1`, `NFR-SC2`), and any pod must be able to serve any request.

## Decision
Use a signed JWT, issued at login, sent as a bearer token, verified statelessly on every request. The token carries the user ID (`sub` claim) and an expiry.

## Alternatives considered
- **Server-side sessions (e.g. `express-session` + Redis).** Requires a shared session store across every pod — a new stateful component to run, back up, and scale. Rejected: adds infrastructure to solve a problem JWT solves with no extra component.

## Consequences
Any backend pod can verify any request independently (satisfies `NFR-SC2`). Logout is client-side (the token isn't server-invalidated) — acceptable for this project's scope per `FR-A7`, but means a stolen token stays valid until it expires; short TTLs (`FR-A8`, default 24h) bound that exposure.
