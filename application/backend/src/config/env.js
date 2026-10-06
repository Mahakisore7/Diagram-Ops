require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];

// Fail fast and loud in every environment except test, where suites supply
// their own mocked config and shouldn't need a real Mongo URI or secret.
if (process.env.NODE_ENV !== 'test') {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  defaultProvider: process.env.DEFAULT_LLM_PROVIDER || 'groq',
  fallbackProvider: process.env.FALLBACK_LLM_PROVIDER || 'claude',
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',

  dailyClaudeCallCap: parseInt(process.env.DAILY_CLAUDE_CALL_CAP || '50', 10),

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
};
