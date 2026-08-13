const { extractJSON, validateSyntax } = require('../src/services/diagramService');

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

  it('throws on genuinely malformed input', () => {
    expect(() => extractJSON('not json at all')).toThrow();
  });
});

describe('validateSyntax', () => {
  it('accepts a flowchart that starts with the flowchart keyword', () => {
    expect(validateSyntax('flowchart', 'flowchart TD\n  A --> B')).toBe(true);
  });

  it('accepts the "graph" alias for flowchart', () => {
    expect(validateSyntax('flowchart', 'graph LR\n  A --> B')).toBe(true);
  });

  it('accepts a sequence diagram', () => {
    expect(validateSyntax('sequence', 'sequenceDiagram\n  Alice->>Bob: Hi')).toBe(true);
  });

  it('rejects syntax that does not match the declared type', () => {
    expect(validateSyntax('sequence', 'flowchart TD\n  A --> B')).toBe(false);
  });

  it('rejects an unknown diagram type', () => {
    expect(validateSyntax('not-a-real-type', 'flowchart TD')).toBe(false);
  });
});
