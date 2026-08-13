# ADR-0002: Free LLM provider as primary, paid provider as fallback

**Status:** Accepted

## Context
Diagram generation (`FR-G1`–`FR-G9`) needs an LLM call on every request. A student project on a ~$40/month AWS budget (`NFR-C1`) can't absorb per-call costs at every request without a way to bound spend.

## Decision
Groq (free tier, 1,000 requests/day) is the primary provider. Anthropic Claude is the fallback, used only when Groq fails, and itself capped by a daily counter (`FR-G6`, ADR-0004).

## Alternatives considered
- **Paid provider only.** Simpler, but every request costs money with no ceiling beyond manual monitoring.
- **Free provider only, no fallback.** Cheaper, but Groq's 1,000/day cap becomes a hard outage the moment it's hit, with no degradation path.

## Consequences
Near-zero cost in the common case, and failover becomes a *real, exercised* code path (UC-3) instead of a theoretical one — which is also better engineering practice, since untested failover code tends to be broken failover code.
