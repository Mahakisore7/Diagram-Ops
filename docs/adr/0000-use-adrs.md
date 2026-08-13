# ADR-0000: Record architecture decisions as ADRs

**Status:** Accepted

## Context
`docs/system-design.md` accumulated a "Design decisions" table with the reasoning behind ten choices. That's the right *content* but the wrong *shape* — a table entry can't be individually superseded, linked to from a commit, or found by someone who only has the decision's name, not the doc's.

## Decision
Every consequential, hard-to-reverse decision gets its own numbered file in `docs/adr/`, using the template in `docs/adr/template.md`. ADRs 0001–0010 below are seeded directly from the `system-design.md` table. New decisions get a new ADR, not a new row bolted onto an existing document.

## Alternatives considered
- **Leave reasoning in prose inside phase docs.** Where it already lived — findable only by reading the whole phase file top to bottom.
- **A single `DECISIONS.md`.** Better than nothing, but doesn't support "superseded by" links or per-decision status.

## Consequences
Each decision is independently citable (`docs/adr/0007-nginx-api-proxy.md`) and independently revisable — if a later phase reverses a choice, that ADR's status changes to `Superseded by ADR-00NN` rather than silently editing history.
