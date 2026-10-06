const GroqProvider = require('./groqProvider');
const ClaudeProvider = require('./claudeProvider');
const { canUseFallback, recordUsage, dailyClaudeCallCap } = require('../costGuard');
const { defaultProvider, fallbackProvider } = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const providers = { groq: new GroqProvider(), claude: new ClaudeProvider() };

// Both errors below extend ApiError so the central error handler returns
// them as-is (429 / 503 with a human-readable message). A plain Error with
// a `status` field is NOT enough - errorHandler only trusts ApiError
// instances and turns everything else into a generic 500.
class DailyCapExceededError extends ApiError {
  constructor(provider, cap) {
    super(429, 'DAILY_CAP_EXCEEDED', `Daily call cap (${cap}) reached for "${provider}". Please try again tomorrow.`);
    this.name = 'DailyCapExceededError';
  }
}

// The upstream provider's own message (e.g. "401 Invalid API Key", "credit
// balance too low") is logged server-side but never sent to the client: it
// describes our infrastructure, not anything the user can act on.
function providerUnavailable(providerName, err) {
  console.error(
    JSON.stringify({ level: 'error', message: `Provider "${providerName}" failed`, error: err?.message }),
  );
  return new ApiError(
    503,
    'LLM_UNAVAILABLE',
    'The AI service is temporarily unavailable. Please try again in a few minutes.',
  );
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

    let text;
    try {
      text = await fallback.generate(systemPrompt, messages);
    } catch (fallbackErr) {
      throw providerUnavailable(fallback.name, fallbackErr);
    }
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
  try {
    return await provider.generate(systemPrompt, messages);
  } catch (err) {
    throw providerUnavailable(provider.name, err);
  }
}

module.exports = { generateWithFallback, generateWithProvider, providers, DailyCapExceededError };
