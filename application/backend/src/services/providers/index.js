const GroqProvider = require('./groqProvider');
const ClaudeProvider = require('./claudeProvider');
const { canUseFallback, recordUsage, dailyClaudeCallCap } = require('../costGuard');
const { defaultProvider, fallbackProvider } = require('../../config/env');

const providers = { groq: new GroqProvider(), claude: new ClaudeProvider() };

class DailyCapExceededError extends Error {
  constructor(provider, cap) {
    super(`Daily call cap (${cap}) reached for "${provider}". Please try again tomorrow.`);
    this.name = 'DailyCapExceededError';
    this.status = 429;
    this.code = 'DAILY_CAP_EXCEEDED';
  }
}

// See the two sequence diagrams in docs/system-design.md §5.2 — this
// function is both of them. Calls the primary; on failure, checks the cap
// BEFORE calling the fallback (docs/adr/0004), and never touches the paid
// provider if the cap is already reached.
async function generateWithFallback(systemPrompt, messages) {
  const primary = providers[defaultProvider];
  try {
    const text = await primary.generate(systemPrompt, messages);
    return { text, providerUsed: primary.name };
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: `Primary provider "${primary.name}" failed, attempting fallback to "${fallbackProvider}"`,
        error: err.message,
      }),
    );

    const fallback = providers[fallbackProvider];
    const allowed = await canUseFallback(fallback.name);
    if (!allowed) throw new DailyCapExceededError(fallback.name, dailyClaudeCallCap);

    const text = await fallback.generate(systemPrompt, messages);
    await recordUsage(fallback.name);
    return { text, providerUsed: fallback.name };
  }
}

// Sticky retry (docs/adr/0003): retries against the SAME provider that
// produced the malformed output, never re-entering the fallback cascade
// above. A formatting glitch from the free provider should cost one more
// free-tier call, not escalate to the paid one.
async function generateWithProvider(providerName, systemPrompt, messages) {
  const provider = providers[providerName];
  return provider.generate(systemPrompt, messages);
}

module.exports = { generateWithFallback, generateWithProvider, providers, DailyCapExceededError };
