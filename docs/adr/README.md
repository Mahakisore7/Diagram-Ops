# Architecture Decision Records

Each file here records one consequential, hard-to-reverse decision: the problem, what we chose, what we rejected, and why. See `template.md` for the format and `0000-use-adrs.md` for why this directory exists at all.

| ADR | Decision |
|---|---|
| [0000](0000-use-adrs.md) | Record architecture decisions as ADRs |
| [0001](0001-jwt-stateless-auth.md) | JWT for authentication instead of server-side sessions |
| [0002](0002-free-provider-primary-paid-fallback.md) | Free LLM provider primary, paid provider fallback |
| [0003](0003-sticky-retry.md) | Retry on bad output stays on the same provider |
| [0004](0004-cap-checked-before-call.md) | Daily cost cap checked before the call, not after |
| [0005](0005-generation-does-not-persist.md) | Generating a diagram does not save it |
| [0006](0006-404-not-403-for-unowned-resources.md) | Unowned resources return 404, not 403 |
| [0007](0007-nginx-api-proxy.md) | nginx proxies `/api` instead of a build-time API URL |
| [0008](0008-reference-not-embed-diagrams.md) | Diagrams reference their owner; not embedded |
| [0009](0009-provider-behind-interface.md) | LLM providers implement a shared interface |
| [0010](0010-mermaid-for-design-docs.md) | Design docs are written in Mermaid, not exported images |
| [0011](0011-lazy-loaded-routes.md) | Frontend routes are lazy-loaded to keep the initial bundle within NFR-P3 |

New decision? Copy `template.md`, number it sequentially, add a row here.
