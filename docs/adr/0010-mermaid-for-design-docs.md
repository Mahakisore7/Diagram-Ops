# ADR-0010: Design documentation is written in Mermaid, not diagramming-tool images

**Status:** Accepted

## Context
`system-design.md` needed an ER diagram and eight UML-family diagrams (use case, class, sequence, activity, state, component, deployment). The usual options are a drawing tool (draw.io, Lucidchart, diagrams.net) exported as an image, or a text-based diagramming syntax.

## Decision
Every diagram in `system-design.md` is written in Mermaid syntax, committed as plain text, and rendered inline by GitHub.

## Alternatives considered
- **draw.io / Lucidchart, exported as PNG/SVG.** More layout control, but the source (a `.drawio` XML file or a cloud document) lives outside the diff a reviewer actually reads — a PR can silently ship a stale image next to updated prose, and there's no way to review *what changed* in a diagram, only that the whole image is different.

## Consequences
Diagrams diff like code and can't silently drift out of sync with a binary nobody remembered to re-export. The tradeoff is layout control — Mermaid's auto-layout is coarser than a hand-placed diagram, which occasionally matters for the busier ones (the deployment diagram). Fittingly, this is also the exact format the application itself generates (`FR-G3`) — the documentation and the product speak the same language.
