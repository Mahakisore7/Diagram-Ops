# ADR-0005: Generating a diagram does not save it

**Status:** Accepted

## Context
Users will generate many draft diagrams while refining a prompt and keep only a few. `POST /api/diagrams/generate` and saving are naturally separable operations (`FR-G7`).

## Decision
Generation returns the result to the client only. Nothing is written to MongoDB until the user explicitly calls `POST /api/diagrams` (`UC-2`).

## Alternatives considered
- **Auto-save every generation.** Removes a click, but fills the `DIAGRAM` collection with abandoned drafts, most of which the user will never look at again — noise in both the data and in what a restore drill (`NFR-A4`) has to account for.

## Consequences
Discarding a bad result (`Rendered → Composing` in the state diagram) is free and leaves no orphan document. The cost is one extra explicit action for the user when they do want to keep something.
