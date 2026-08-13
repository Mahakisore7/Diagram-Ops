jest.mock('../src/models/ProviderUsage');
const ProviderUsage = require('../src/models/ProviderUsage');
const { canUseFallback, recordUsage, getTodayClaudeUsage } = require('../src/services/costGuard');

describe('costGuard — docs/adr/0004', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows fallback when under the daily cap', async () => {
    ProviderUsage.findOne.mockResolvedValue({ count: 5 });
    expect(await canUseFallback('claude')).toBe(true);
  });

  it('blocks fallback once the daily cap is reached', async () => {
    ProviderUsage.findOne.mockResolvedValue({ count: 50 });
    expect(await canUseFallback('claude')).toBe(false);
  });

  it('allows fallback when no usage record exists yet for today', async () => {
    ProviderUsage.findOne.mockResolvedValue(null);
    expect(await canUseFallback('claude')).toBe(true);
  });

  it('never restricts the free/default provider', async () => {
    expect(await canUseFallback('groq')).toBe(true);
    expect(ProviderUsage.findOne).not.toHaveBeenCalled();
  });

  it('recordUsage upserts an atomic increment, scoped to today and claude', async () => {
    ProviderUsage.findOneAndUpdate.mockResolvedValue({});
    await recordUsage('claude');

    expect(ProviderUsage.findOneAndUpdate).toHaveBeenCalledWith(
      { date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), provider: 'claude' },
      { $inc: { count: 1 } },
      { upsert: true },
    );
  });

  it('recordUsage is a no-op for the free provider', async () => {
    await recordUsage('groq');
    expect(ProviderUsage.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('getTodayClaudeUsage reports zero when nothing has been recorded', async () => {
    ProviderUsage.findOne.mockResolvedValue(null);
    const usage = await getTodayClaudeUsage();
    expect(usage).toEqual({ count: 0, cap: 50 });
  });
});
