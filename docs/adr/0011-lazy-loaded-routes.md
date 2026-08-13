# ADR-0011: Frontend routes are lazy-loaded

**Status:** Accepted

## Context
`NFR-P3` in `docs/functional-spec.md` sets a 500 KB gzipped budget for the initial page load. The first working build of `App.jsx` statically imported all five pages up front. A production build measured the main chunk alone at 937 KB (250 KB gzipped) — half the entire budget before React, react-router-dom, or axios were even accounted for. The cause: `GeneratePage` and `DiagramDetailPage` import `MermaidRenderer`, which imports `mermaid` — and a static import anywhere in the tree bundles into the same eagerly-loaded chunk every route pays for, including `/login`, which never touches a diagram.

## Decision
Every page in `App.jsx` is imported via `React.lazy(() => import('./pages/X'))`, wrapped in a single `<Suspense>` boundary. Vite/Rollup then emits each page as its own chunk, fetched only when a user actually navigates to a route that needs it.

## Alternatives considered
- **Leave it static and raise/ignore the budget.** Cheapest short-term, but a visitor who only ever logs in never needed mermaid's weight in the first place — the budget was catching a real, fixable problem, not an arbitrary one.
- **Dynamically `import('mermaid')` only inside `MermaidRenderer`, keep pages static.** Would shrink the chunk but still bundles `GeneratePage`/`DiagramDetailPage`'s own code into the same chunk as `LoginPage`; route-level splitting is the coarser and more standard fix, and covers this case for free.

## Consequences
`/login` and `/register` no longer pay mermaid's cost at all. The tradeoff is a brief `Suspense` fallback on first navigation to a not-yet-fetched route — acceptable, and mitigated by the browser caching each chunk after its first load.
