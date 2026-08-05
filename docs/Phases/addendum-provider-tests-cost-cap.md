# Addendum — Provider Test Coverage & Daily Cost-Safety Cap
### Closing the Two Real Gaps the Multi-Provider Change Introduced

---

## Part 1 — Actual test coverage for the provider abstraction

The old tests only covered the single-provider code path. These specifically test the behavior that matters: does fallback actually trigger, does retry actually stay sticky, does JSON extraction actually handle Groq's markdown-fence habit.

```javascript
// tests/providers.test.js
jest.mock('../src/services/providers/groqProvider');
jest.mock('../src/services/providers/claudeProvider');

const GroqProvider = require('../src/services/providers/groqProvider');
const ClaudeProvider = require('../src/services/providers/claudeProvider');

describe('generateWithFallback', () => {
  beforeEach(() => {
    jest.resetModules();
    GroqProvider.mockClear();
    ClaudeProvider.mockClear();
  });

  it('uses the primary provider when it succeeds', async () => {
    GroqProvider.mockImplementation(() => ({ name: 'groq', generate: jest.fn().mockResolvedValue('{"diagramType":"flowchart"}') }));
    ClaudeProvider.mockImplementation(() => ({ name: 'claude', generate: jest.fn() }));

    const { generateWithFallback } = require('../src/services/providers');
    const result = await generateWithFallback('sys', [{ role: 'user', content: 'hi' }]);
    expect(result.providerUsed).toBe('groq');
  });

  it('falls back to Claude when Groq throws', async () => {
    GroqProvider.mockImplementation(() => ({ name: 'groq', generate: jest.fn().mockRejectedValue(new Error('rate limited')) }));
    ClaudeProvider.mockImplementation(() => ({ name: 'claude', generate: jest.fn().mockResolvedValue('{"diagramType":"flowchart"}') }));

    const { generateWithFallback } = require('../src/services/providers');
    const result = await generateWithFallback('sys', [{ role: 'user', content: 'hi' }]);
    expect(result.providerUsed).toBe('claude');
  });
});
```

```javascript
// tests/diagramGenerator.test.js — add these cases to the existing file
const { extractJSON } = require('../src/services/diagramGenerator');

describe('extractJSON', () => {
  it('parses plain JSON', () => {
    expect(extractJSON('{"a": 1}')).toEqual({ a: 1 });
  });
  it('strips ```json fences', () => {
    expect(extractJSON('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it('strips bare ``` fences', () => {
    expect(extractJSON('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it('handles surrounding whitespace', () => {
    expect(extractJSON('  \n{"a": 1}\n  ')).toEqual({ a: 1 });
  });
});
```

```javascript
// tests/stickyRetry.test.js — proves retry does NOT re-trigger the fallback cascade
jest.mock('../src/services/providers');
const { generateWithFallback, providers } = require('../src/services/providers');
jest.mock('../src/middleware/metrics', () => ({
  diagramGenerations: { inc: jest.fn() },
  diagramGenerationDuration: { startTimer: jest.fn(() => jest.fn()) },
}));

describe('generateDiagram — sticky retry', () => {
  it('retries with the SAME provider that succeeded, never touches the other one', async () => {
    generateWithFallback.mockResolvedValue({
      text: '{"diagramType":"sequence","title":"t","mermaidSyntax":"graph TD\\nA-->B"}', // wrong syntax on purpose
      providerUsed: 'groq',
    });
    providers.groq = { generate: jest.fn().mockResolvedValue('{"diagramType":"sequence","title":"t","mermaidSyntax":"sequenceDiagram\\nAlice->>Bob: Hi"}') };
    providers.claude = { generate: jest.fn() };

    const { generateDiagram } = require('../src/services/diagramGenerator');
    const result = await generateDiagram('some input');

    expect(providers.groq.generate).toHaveBeenCalledTimes(1);
    expect(providers.claude.generate).not.toHaveBeenCalled();
    expect(result.providerUsed).toBe('groq');
  });
});
```

---

## Part 2 — The daily cost-safety cap

The real risk: Groq's free tier caps at 1,000 requests/day. Once exhausted, the current fallback logic would silently route *every* request to Claude for the rest of the day with no limit. This adds a hard stop.

```javascript
// src/models/ProviderUsage.js
const mongoose = require('mongoose');

const providerUsageSchema = new mongoose.Schema({
  date: { type: String, required: true },     // YYYY-MM-DD
  provider: { type: String, required: true },
  count: { type: Number, default: 0 },
});
providerUsageSchema.index({ date: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('ProviderUsage', providerUsageSchema);
```

```javascript
// src/services/costGuard.js
const ProviderUsage = require('../models/ProviderUsage');

const DAILY_CLAUDE_CAP = parseInt(process.env.DAILY_CLAUDE_CALL_CAP || '50', 10);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function canUseFallback(providerName) {
  if (providerName !== 'claude') return true; // only the paid provider is guarded
  const record = await ProviderUsage.findOne({ date: todayKey(), provider: 'claude' });
  return !record || record.count < DAILY_CLAUDE_CAP;
}

async function recordUsage(providerName) {
  if (providerName !== 'claude') return;
  await ProviderUsage.findOneAndUpdate(
    { date: todayKey(), provider: 'claude' },
    { $inc: { count: 1 } },
    { upsert: true },
  );
}

async function getTodayClaudeUsage() {
  const record = await ProviderUsage.findOne({ date: todayKey(), provider: 'claude' });
  return { count: record?.count || 0, cap: DAILY_CLAUDE_CAP };
}

module.exports = { canUseFallback, recordUsage, getTodayClaudeUsage, DAILY_CLAUDE_CAP };
```

```javascript
// src/services/providers/index.js — updated to enforce the cap
const GroqProvider = require('./groqProvider');
const ClaudeProvider = require('./claudeProvider');
const { canUseFallback, recordUsage, DAILY_CLAUDE_CAP } = require('../costGuard');

const providers = { groq: new GroqProvider(), claude: new ClaudeProvider() };
const DEFAULT_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || 'groq';
const FALLBACK_PROVIDER = process.env.FALLBACK_LLM_PROVIDER || 'claude';

class DailyCapExceededError extends Error {
  constructor(provider, cap) {
    super(`Daily call cap (${cap}) reached for "${provider}". Please try again tomorrow.`);
    this.name = 'DailyCapExceededError';
    this.status = 429;
  }
}

async function generateWithFallback(systemPrompt, messages) {
  const primary = providers[DEFAULT_PROVIDER];
  try {
    const text = await primary.generate(systemPrompt, messages);
    return { text, providerUsed: primary.name };
  } catch (err) {
    console.warn(`Primary provider "${primary.name}" failed (${err.message}) — attempting fallback to "${FALLBACK_PROVIDER}"`);
    const fallback = providers[FALLBACK_PROVIDER];

    const allowed = await canUseFallback(fallback.name);
    if (!allowed) throw new DailyCapExceededError(fallback.name, DAILY_CLAUDE_CAP);

    const text = await fallback.generate(systemPrompt, messages);
    await recordUsage(fallback.name);
    return { text, providerUsed: fallback.name };
  }
}

module.exports = { generateWithFallback, providers, DailyCapExceededError };
```

A small transparency endpoint, useful for both you and the frontend:
```javascript
// src/controllers/diagram.controller.js — add
const { getTodayClaudeUsage } = require('../services/costGuard');

exports.providerStatus = async (req, res, next) => {
  try {
    res.json(await getTodayClaudeUsage());
  } catch (err) { next(err); }
};
```
```javascript
// src/routes/diagram.routes.js — add
router.get('/provider-status', ctrl.providerStatus);
```

```javascript
// src/middleware/metrics.js — add a gauge so this is visible in Grafana too
const claudeDailyUsage = new client.Gauge({
  name: 'claude_fallback_daily_usage',
  help: 'Number of Claude fallback calls used today, against the configured daily cap',
});
register.registerMetric(claudeDailyUsage);
// exported alongside the existing metrics; update it inside recordUsage() or on a short interval
```

```bash
# tests/costGuard.test.js
```
```javascript
jest.mock('../src/models/ProviderUsage');
const ProviderUsage = require('../src/models/ProviderUsage');
const { canUseFallback } = require('../src/services/costGuard');

describe('costGuard', () => {
  it('allows fallback when under the daily cap', async () => {
    ProviderUsage.findOne.mockResolvedValue({ count: 5 });
    expect(await canUseFallback('claude')).toBe(true);
  });
  it('blocks fallback once the daily cap is reached', async () => {
    ProviderUsage.findOne.mockResolvedValue({ count: 50 });
    expect(await canUseFallback('claude')).toBe(false);
  });
  it('never restricts the free/default provider', async () => {
    expect(await canUseFallback('groq')).toBe(true);
  });
});
```

```bash
# .env.example, docker-compose.yaml, Helm values — add
DAILY_CLAUDE_CALL_CAP=50
```

Fifty Claude calls a day at roughly a cent each is about fifty cents — a real, deliberately chosen ceiling, not an arbitrary number. Adjust it once you know your actual demo traffic.

---

## Part 3 — On the stale report

I'm not regenerating the full `.docx` after every incremental change — that would mean re-running the whole report pipeline after every future addendum too, which doesn't scale. Instead: the phase files and addenda in `docs/phases/` are the living source of truth, and the report is a periodic snapshot you regenerate deliberately (end of a work session, before a submission deadline, before an interview) rather than after every commit. I'll regenerate it now since you're asking, and flag this as the pattern going forward rather than silently keeping it perpetually current.

---

## Git practices

```bash
git checkout -b fix/provider-tests-and-cost-cap

git add application/backend/tests/providers.test.js application/backend/tests/stickyRetry.test.js
git commit -m "test(backend): add provider fallback and sticky-retry coverage"

git add application/backend/tests/diagramGenerator.test.js
git commit -m "test(backend): add extractJSON markdown-fence stripping coverage"

git add application/backend/src/models/ProviderUsage.js application/backend/src/services/costGuard.js
git commit -m "feat(backend): add daily Claude fallback cost cap with MongoDB-backed usage tracking"

git add application/backend/src/services/providers/index.js
git commit -m "feat(backend): enforce daily cost cap before falling back to Claude"

git add application/backend/src/controllers/diagram.controller.js application/backend/src/routes/diagram.routes.js
git commit -m "feat(api): add provider-status endpoint for usage transparency"

git add application/backend/src/middleware/metrics.js
git commit -m "feat(observability): add claude_fallback_daily_usage gauge"

git add application/backend/tests/costGuard.test.js
git commit -m "test(backend): add cost guard cap-enforcement coverage"

git push origin fix/provider-tests-and-cost-cap
```

## Verification checklist

- [ ] `npm test` in `application/backend` passes, including all three new test files
- [ ] Manually set `DAILY_CLAUDE_CALL_CAP=1`, trigger two Groq failures in a row, confirm the second one returns a clear 429 with the cap message instead of silently calling Claude
- [ ] `GET /api/diagrams/provider-status` returns accurate `{ count, cap }` values
- [ ] The new Grafana gauge shows real data after a few fallback calls
