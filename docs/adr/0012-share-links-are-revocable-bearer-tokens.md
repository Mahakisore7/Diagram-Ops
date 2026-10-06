# ADR-0012: Public share links are revocable bearer tokens

**Status:** Accepted

## Context
Users need to show a diagram to someone without a DiagramForge account (a reviewer, a teammate in chat). Every existing diagram route is behind `requireAuth` and scoped by owner (ADR-0006), so there was no way to expose one diagram publicly without either weakening that model or inventing a second permission system.

## Decision
Sharing a diagram stores a random 24-character `shareToken` (18 bytes from `crypto.randomBytes`, base64url — 144 bits) on the diagram, and an unauthenticated, IP-rate-limited route `GET /api/public/diagrams/:token` returns only the render fields (`title`, `diagramType`, `mermaidSyntax`, `updatedAt`) of the diagram holding that token. Revoking deletes the token; re-sharing issues a new one.

## Alternatives considered
- **Make the diagram id itself public (`/s/:diagramId`).** ObjectIds are partly time-ordered and therefore guessable, and a link could never be revoked without deleting the diagram.
- **Signed, expiring URLs (JWT in the link).** Cannot be revoked before expiry without a server-side denylist, which is a stored token again with extra complexity.
- **Per-user sharing / ACLs.** The right long-term model for teams, but needs invitations, roles and recipient accounts — far beyond the current scope.

## Consequences
The token is the only credential, so it is treated like one: high entropy, format-checked before any database query, never logged, and rejected identically whether malformed, revoked or unknown (404). The public payload deliberately excludes `userId` and `sourceText`, so a link reveals the picture, not the account or the prompt behind it. A sparse unique index keeps lookups fast without indexing the (majority) unshared diagrams. Anyone holding a link can view until it is revoked — there is no expiry or view tracking yet.
