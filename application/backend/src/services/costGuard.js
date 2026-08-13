const ProviderUsage = require('../models/ProviderUsage');
const { dailyClaudeCallCap } = require('../config/env');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Only the paid provider is metered — see docs/adr/0004. Called BEFORE
// ProviderRegistry invokes the fallback provider, never after, so the
// call that would exceed the cap is never made in the first place.
async function canUseFallback(providerName) {
  if (providerName !== 'claude') return true;
  const record = await ProviderUsage.findOne({ date: todayKey(), provider: 'claude' });
  return !record || record.count < dailyClaudeCallCap;
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
  return { count: record?.count || 0, cap: dailyClaudeCallCap };
}

module.exports = { canUseFallback, recordUsage, getTodayClaudeUsage, dailyClaudeCallCap };
