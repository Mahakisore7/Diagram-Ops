# ADR-0004: Daily cost cap is checked before the fallback call, not after

**Status:** Accepted

## Context
The paid fallback provider (ADR-0002) needs a hard daily ceiling (`FR-G6`, `NFR-C2`) so a bad day for the free provider can't turn into an open-ended bill.

## Decision
`canUseFallback(provider)` is called and checked **before** `ProviderRegistry` invokes the paid provider. If the cap is already reached, throw `DailyCapExceededError` (`429`) and never make the call.

## Alternatives considered
- **Call the provider, then check/record usage afterward.** Simpler code, but the call — and its cost — has already happened by the time the cap is enforced. A cap enforced after spending isn't a cap, it's a report.

## Consequences
The 51st paid call of the day costs exactly $0.00, not one more call's worth. The tradeoff is a small amount of added latency per fallback call (one extra MongoDB read) — negligible next to an LLM round trip.
