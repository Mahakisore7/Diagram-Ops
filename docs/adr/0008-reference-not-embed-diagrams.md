# ADR-0008: Diagrams reference their owner; they aren't embedded in the User document

**Status:** Accepted

## Context
MongoDB is a document database — embedding related data in a parent document is idiomatic and often faster than a reference for data that's always read together. `USER` and `DIAGRAM` (see the ER diagram in `system-design.md`) could be modeled either way.

## Decision
`DIAGRAM` is its own collection with an indexed `userId` field referencing `USER._id`. Diagrams are not embedded inside the user document.

## Alternatives considered
- **Embed an array of diagrams inside `USER`.** Fewer queries for "give me this user and all their diagrams." Rejected: MongoDB enforces a hard 16 MB per-document limit. A user who accumulates a few thousand diagrams — plausible over the life of a real account — would eventually hit that ceiling, at which point every further save fails. A reference has no such limit.

## Consequences
Listing a user's diagrams (`FR-D2`) costs one indexed query instead of one document fetch — the compound index `{ userId: 1, createdAt: -1 }` (see `system-design.md` §3) exists specifically to keep that query fast regardless of how many diagrams a user accumulates.
