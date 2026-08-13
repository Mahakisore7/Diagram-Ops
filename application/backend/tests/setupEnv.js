// Jest sets NODE_ENV=test automatically, which is what lets config/env.js
// skip its fail-fast check for required vars (see that file). These are
// still supplied so services that read them (authService signing a JWT,
// costGuard reading the cap) behave deterministically across every test run.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/diagramops-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-for-real-use';
process.env.DAILY_CLAUDE_CALL_CAP = process.env.DAILY_CLAUDE_CALL_CAP || '50';

// The Groq (OpenAI-compatible) and Anthropic SDK constructors both throw
// immediately if no API key is present — and providers/index.js constructs
// both provider classes eagerly at require() time (see ADR-0009). Any test
// that transitively imports diagramService pulls this chain in, so dummy
// keys are required here even for tests that never make a real LLM call.
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-groq-key';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-anthropic-key';
