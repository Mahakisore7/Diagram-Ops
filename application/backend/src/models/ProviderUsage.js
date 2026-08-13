const mongoose = require('mongoose');

const providerUsageSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  provider: { type: String, required: true },
  count: { type: Number, default: 0 },
});

// Unique on (date, provider) so the upsert in costGuard.recordUsage is
// atomic under concurrency — two simultaneous requests can't create two
// competing counters for the same day.
providerUsageSchema.index({ date: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('ProviderUsage', providerUsageSchema);
