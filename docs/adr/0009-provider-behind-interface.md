# ADR-0009: LLM providers implement a shared interface

**Status:** Accepted

## Context
`ProviderRegistry` needs to call Groq and Claude interchangeably for fallback (ADR-0002) to work, and the test suite (`tests/providers.test.js`, `tests/stickyRetry.test.js`) needs to exercise that logic without making real, billable API calls.

## Decision
Define `ILLMProvider` (`name`, `generate(systemPrompt, messages)`) as the shape every provider implements. `GroqProvider` and `ClaudeProvider` are concrete implementations. `ProviderRegistry` depends only on the interface — this is the Dependency Inversion Principle applied concretely.

## Alternatives considered
- **Call each SDK directly from `DiagramService`.** Fewer files, but fallback logic and provider-specific SDK calls end up tangled together, and testing requires either real API calls or mocking two different SDKs' worth of surface area throughout the test suite.

## Consequences
Adding a third provider is one new class, zero changes to `ProviderRegistry`. Tests mock `ILLMProvider` once and the entire fallback/retry/cap logic (ADR-0002, 0003, 0004) runs in milliseconds with zero API spend. Swapping which provider is primary is an environment variable.
