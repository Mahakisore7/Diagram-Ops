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

  it('succeeds silently when the caller owns the diagram', async () => {
    Diagram.deleteOne.mockResolvedValue({ deletedCount: 1 });
    await expect(diagramService.deleteOwned('user-A', 'id1')).resolves.toBeUndefined();
    expect(Diagram.deleteOne).toHaveBeenCalledWith({ _id: 'id1', userId: 'user-A' });
  });

  it('throws 404 when the caller does not own it (deleteCount 0)', async () => {
    Diagram.deleteOne.mockResolvedValue({ deletedCount: 0 });
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
