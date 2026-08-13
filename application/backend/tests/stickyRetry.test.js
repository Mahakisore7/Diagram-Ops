jest.mock('../src/services/providers');
const { generateWithFallback, generateWithProvider } = require('../src/services/providers');
const { generateDiagram } = require('../src/services/diagramService');

describe('generateDiagram — sticky retry (docs/adr/0003)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retries with the SAME provider on a syntax mismatch, never re-enters the fallback cascade', async () => {
    generateWithFallback.mockResolvedValue({
      text: '{"diagramType":"sequence","title":"t","mermaidSyntax":"flowchart TD\\nA-->B"}', // wrong syntax on purpose
      providerUsed: 'groq',
    });
    generateWithProvider.mockResolvedValue(
      '{"diagramType":"sequence","title":"t","mermaidSyntax":"sequenceDiagram\\nAlice->>Bob: Hi"}',
    );

    const result = await generateDiagram('some input');

    expect(generateWithFallback).toHaveBeenCalledTimes(1);
    expect(generateWithProvider).toHaveBeenCalledTimes(1);
    expect(generateWithProvider).toHaveBeenCalledWith('groq', expect.any(String), expect.any(Array));
    expect(result.providerUsed).toBe('groq');
    expect(result.mermaidSyntax).toContain('sequenceDiagram');
  });

  it('retries on unparseable JSON the same way', async () => {
    generateWithFallback.mockResolvedValue({ text: 'not json at all', providerUsed: 'claude' });
    generateWithProvider.mockResolvedValue('{"diagramType":"flowchart","title":"t","mermaidSyntax":"flowchart TD\\nA-->B"}');

    const result = await generateDiagram('some input');

    expect(generateWithProvider).toHaveBeenCalledTimes(1);
    expect(result.providerUsed).toBe('claude');
  });

  it('gives up after exactly one retry — never loops indefinitely', async () => {
    generateWithFallback.mockResolvedValue({ text: 'garbage', providerUsed: 'groq' });
    generateWithProvider.mockResolvedValue('still garbage');

    await expect(generateDiagram('some input')).rejects.toMatchObject({
      status: 502,
      code: 'LLM_INVALID_OUTPUT',
    });
    expect(generateWithProvider).toHaveBeenCalledTimes(1);
  });

  it('records generationMs on the result', async () => {
    generateWithFallback.mockResolvedValue({
      text: '{"diagramType":"flowchart","title":"t","mermaidSyntax":"flowchart TD\\nA-->B"}',
      providerUsed: 'groq',
    });

    const result = await generateDiagram('some input');
    expect(typeof result.generationMs).toBe('number');
    expect(result.generationMs).toBeGreaterThanOrEqual(0);
  });
});
