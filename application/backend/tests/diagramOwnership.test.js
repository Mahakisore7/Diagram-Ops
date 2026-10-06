jest.mock('../src/models/Diagram');
const Diagram = require('../src/models/Diagram');
Diagram.DIAGRAM_TYPES = ['flowchart', 'sequence', 'class', 'er', 'state', 'gantt', 'mindmap'];

const diagramService = require('../src/services/diagramService');

describe('findOwned — FR-D7 / docs/adr/0006', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the diagram when the caller is the owner', async () => {
    Diagram.findOne.mockImplementation(({ _id, userId }) =>
      Promise.resolve(userId === 'user-A' ? { _id, userId, title: 'Mine' } : null),
    );

    const diagram = await diagramService.findOwned('user-A', '507f1f77bcf86cd799439011');
    expect(diagram.title).toBe('Mine');
    expect(Diagram.findOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011', userId: 'user-A' });
  });

  it('throws 404 NOT_FOUND — not 403 — when a diagram exists but belongs to someone else', async () => {
    // The mock only "finds" documents for user-A, simulating a real diagram
    // that exists but is owned by a different user.
    Diagram.findOne.mockImplementation(({ userId }) =>
      Promise.resolve(userId === 'user-A' ? { _id: 'x', userId, title: 'Theirs' } : null),
    );

    await expect(diagramService.findOwned('user-B', '507f1f77bcf86cd799439011')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws the identical 404 for a diagram that does not exist at all', async () => {
    Diagram.findOne.mockResolvedValue(null);

    await expect(diagramService.findOwned('user-A', '507f1f77bcf86cd799439099')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('deleteOwned', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes with a single owner-scoped query and returns the deleted diagram', async () => {
    Diagram.findOneAndDelete.mockResolvedValue({ _id: 'id1', title: 'Gone' });
    await expect(diagramService.deleteOwned('user-A', 'id1')).resolves.toMatchObject({ title: 'Gone' });
    expect(Diagram.findOneAndDelete).toHaveBeenCalledWith({ _id: 'id1', userId: 'user-A' });
  });

  it('throws 404 when the caller does not own it (nothing matched)', async () => {
    Diagram.findOneAndDelete.mockResolvedValue(null);
    await expect(diagramService.deleteOwned('user-B', 'id1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('listForUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only counts and returns documents scoped to the caller', async () => {
    const chain = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ title: 'A' }]) };
    Diagram.find.mockReturnValue(chain);
    Diagram.countDocuments.mockResolvedValue(1);

    const result = await diagramService.listForUser('user-A', 1, 20);

    expect(Diagram.find).toHaveBeenCalledWith({ userId: 'user-A' });
    expect(Diagram.countDocuments).toHaveBeenCalledWith({ userId: 'user-A' });
    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });
});

describe('listForUser - search, filter, sort', () => {
  beforeEach(() => jest.clearAllMocks());

  function mockChain() {
    const chain = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    Diagram.find.mockReturnValue(chain);
    Diagram.countDocuments.mockResolvedValue(0);
    return chain;
  }

  it('keeps userId in the query alongside type and title filters', async () => {
    mockChain();
    await diagramService.listForUser('user-A', 1, 20, { type: 'er', q: 'orders' });
    const [query] = Diagram.find.mock.calls[0];
    expect(query.userId).toBe('user-A');
    expect(query.diagramType).toBe('er');
    expect(query.title).toEqual({ $regex: 'orders', $options: 'i' });
    expect(Diagram.countDocuments).toHaveBeenCalledWith(query);
  });

  it('escapes regex metacharacters so search input is matched literally (no ReDoS)', async () => {
    mockChain();
    await diagramService.listForUser('user-A', 1, 20, { q: '(a+)+$' });
    const [query] = Diagram.find.mock.calls[0];
    expect(query.title.$regex).toBe('\\(a\\+\\)\\+\\$');
    expect(new RegExp(query.title.$regex).test('(a+)+$')).toBe(true);
  });

  it('falls back to newest-first for an unknown sort key', async () => {
    const chain = mockChain();
    await diagramService.listForUser('user-A', 1, 20, { sort: 'drop-table' });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});

describe('updateOwned - version history', () => {
  beforeEach(() => jest.clearAllMocks());

  function mockDiagram(fields) {
    const doc = { versions: [], ...fields };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toJSON = () => ({ ...doc });
    Diagram.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(doc) });
    return doc;
  }

  it('snapshots the previous content before overwriting it', async () => {
    const savedAt = new Date('2026-01-01');
    const doc = mockDiagram({ title: 'Old', mermaidSyntax: 'flowchart TD; A-->B', updatedAt: savedAt });

    const result = await diagramService.updateOwned('user-A', 'id1', { mermaidSyntax: 'flowchart TD; A-->C' });

    expect(doc.versions).toEqual([{ title: 'Old', mermaidSyntax: 'flowchart TD; A-->B', savedAt }]);
    expect(doc.mermaidSyntax).toBe('flowchart TD; A-->C');
    expect(result.versions).toBeUndefined();
  });

  it('does not create a version for metadata-only edits', async () => {
    const doc = mockDiagram({ title: 'T', mermaidSyntax: 'x', isFavorite: false, tags: [] });
    await diagramService.updateOwned('user-A', 'id1', { isFavorite: true, tags: ['infra'] });
    expect(doc.versions).toHaveLength(0);
    expect(doc.isFavorite).toBe(true);
    expect(doc.tags).toEqual(['infra']);
  });

  it('keeps at most MAX_VERSIONS, dropping the oldest', async () => {
    const versions = Array.from({ length: 20 }, (_, i) => ({ title: `v${i}`, mermaidSyntax: 's', savedAt: new Date() }));
    const doc = mockDiagram({ title: 'current', mermaidSyntax: 's', versions });
    await diagramService.updateOwned('user-A', 'id1', { title: 'next' });
    expect(doc.versions).toHaveLength(20);
    expect(doc.versions[0].title).toBe('v1');
    expect(doc.versions[19].title).toBe('current');
  });
});

describe('sharing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('issues a 24-char URL-safe token and reuses it on repeat calls', async () => {
    const doc = { shareToken: undefined, save: jest.fn() };
    Diagram.findOne.mockResolvedValue(doc);

    await diagramService.shareOwned('user-A', 'id1');
    const first = doc.shareToken;
    expect(first).toMatch(/^[A-Za-z0-9_-]{24}$/);

    await diagramService.shareOwned('user-A', 'id1');
    expect(doc.shareToken).toBe(first);
  });

  it('public lookup rejects malformed tokens without touching the database', async () => {
    await expect(diagramService.findShared('../../etc')).rejects.toMatchObject({ status: 404 });
    expect(Diagram.findOne).not.toHaveBeenCalled();
  });

  it('public lookup exposes only render fields, never owner or prompt', async () => {
    Diagram.findOne.mockResolvedValue({
      userId: 'user-A',
      sourceText: 'secret prompt',
      title: 'T',
      diagramType: 'flowchart',
      mermaidSyntax: 'flowchart TD',
      updatedAt: new Date(),
    });
    const shared = await diagramService.findShared('A'.repeat(24));
    expect(Object.keys(shared).sort()).toEqual(['diagramType', 'mermaidSyntax', 'title', 'updatedAt']);
  });
});
