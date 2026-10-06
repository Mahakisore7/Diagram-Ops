jest.mock('../src/services/providers/groqProvider');
jest.mock('../src/services/providers/claudeProvider');
jest.mock('../src/services/costGuard');

const GroqProvider = require('../src/services/providers/groqProvider');
const ClaudeProvider = require('../src/services/providers/claudeProvider');
const costGuard = require('../src/services/costGuard');

// These jest.fn()s are wired into the provider instances ONCE below, then
// reused across every test via .mockReset() — NOT re-required per test.
// (An earlier version of this file called jest.resetModules() in
// beforeEach, which silently created a second, unconfigured copy of these
// mocked classes: the one providers/index.js actually instantiated
// internally was never the one this file was configuring. Every assertion
// "passed" by accident — the fallback logic wasn't under test at all.)
const mockGroqGenerate = jest.fn();
const mockClaudeGenerate = jest.fn();
GroqProvider.mockImplementation(() => ({ name: 'groq', generate: mockGroqGenerate }));
ClaudeProvider.mockImplementation(() => ({ name: 'claude', generate: mockClaudeGenerate }));

const { generateWithFallback: generate, generateWithProvider } = require('../src/services/providers');
const ApiError = require('../src/utils/ApiError');

describe('generateWithFallback — docs/adr/0002, 0004', () => {
  beforeEach(() => {
    mockGroqGenerate.mockReset();
    mockClaudeGenerate.mockReset();
    costGuard.canUseFallback.mockReset().mockResolvedValue(true);
    costGuard.recordUsage.mockReset().mockResolvedValue(undefined);
  });

  it('uses the primary provider when it succeeds — never touches the fallback', async () => {
    mockGroqGenerate.mockResolvedValue('{"diagramType":"flowchart"}');

    const result = await generate('sys', [{ role: 'user', content: 'hi' }]);

    expect(result.providerUsed).toBe('groq');
    expect(mockClaudeGenerate).not.toHaveBeenCalled();
  });

  it('falls back to Claude when Groq throws, and records usage', async () => {
    mockGroqGenerate.mockRejectedValue(new Error('rate limited'));
    mockClaudeGenerate.mockResolvedValue('{"diagramType":"flowchart"}');

    const result = await generate('sys', [{ role: 'user', content: 'hi' }]);

    expect(result.providerUsed).toBe('claude');
    expect(costGuard.recordUsage).toHaveBeenCalledWith('claude');
  });

  it('checks the cap BEFORE calling Claude, and never calls it once the cap is reached', async () => {
    mockGroqGenerate.mockRejectedValue(new Error('rate limited'));
    costGuard.canUseFallback.mockResolvedValue(false);

    const err = await generate('sys', [{ role: 'user', content: 'hi' }]).catch((e) => e);
    // Must be an ApiError, not just shaped like one - errorHandler maps any
    // other error class to a generic 500 regardless of its status field.
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 429, code: 'DAILY_CAP_EXCEEDED' });
    expect(mockClaudeGenerate).not.toHaveBeenCalled();
  });

  it('returns 503 LLM_UNAVAILABLE when both providers fail, without leaking upstream details', async () => {
    mockGroqGenerate.mockRejectedValue(new Error('401 Invalid API Key'));
    mockClaudeGenerate.mockRejectedValue(new Error('Your credit balance is too low'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const err = await generate('sys', [{ role: 'user', content: 'hi' }]).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 503, code: 'LLM_UNAVAILABLE' });
    expect(err.message).not.toMatch(/credit|API Key/i);
  });

  it('maps a sticky-retry provider failure to 503 as well', async () => {
    mockGroqGenerate.mockRejectedValue(new Error('timeout'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = await generateWithProvider('groq', 'sys', []).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
  });
});
