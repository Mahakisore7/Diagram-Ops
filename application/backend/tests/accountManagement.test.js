jest.mock('../src/models/User');
jest.mock('../src/models/Diagram');
jest.mock('../src/models/ActivityEvent');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Diagram = require('../src/models/Diagram');
const ActivityEvent = require('../src/models/ActivityEvent');
const authService = require('../src/services/authService');

// A user document as Mongoose would return it: a plain object with a
// save() method, so tests can assert on what was persisted.
async function mockUser(password = 'correcthorse1') {
  const user = { _id: 'u1', email: 'a@b.com', name: '', passwordHash: await bcrypt.hash(password, 4) };
  user.save = jest.fn().mockResolvedValue(user);
  User.findById.mockResolvedValue(user);
  return user;
}

describe('authService.updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates the display name and saves', async () => {
    const user = await mockUser();
    const updated = await authService.updateProfile('u1', { name: 'Ada' });
    expect(updated.name).toBe('Ada');
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects with 401 when the user no longer exists', async () => {
    User.findById.mockResolvedValue(null);
    await expect(authService.updateProfile('gone', { name: 'x' })).rejects.toMatchObject({ status: 401 });
  });
});

describe('authService.changePassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores a new bcrypt hash when the current password is correct', async () => {
    const user = await mockUser('correcthorse1');
    const oldHash = user.passwordHash;

    await authService.changePassword('u1', 'correcthorse1', 'batterystaple2');

    expect(user.passwordHash).not.toBe(oldHash);
    expect(user.passwordHash).not.toBe('batterystaple2');
    expect(await bcrypt.compare('batterystaple2', user.passwordHash)).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('refuses with 403 INVALID_PASSWORD when the current password is wrong', async () => {
    const user = await mockUser('correcthorse1');
    await expect(authService.changePassword('u1', 'wrong-pass1', 'batterystaple2')).rejects.toMatchObject({
      status: 403,
      code: 'INVALID_PASSWORD',
    });
    expect(user.save).not.toHaveBeenCalled();
  });
});

describe('authService.deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes the user's diagrams, then the user", async () => {
    await mockUser('correcthorse1');
    Diagram.deleteMany.mockResolvedValue({ deletedCount: 3 });
    User.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await authService.deleteAccount('u1', 'correcthorse1');

    expect(Diagram.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(ActivityEvent.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'u1' });
    const diagramsOrder = Diagram.deleteMany.mock.invocationCallOrder[0];
    const userOrder = User.deleteOne.mock.invocationCallOrder[0];
    expect(diagramsOrder).toBeLessThan(userOrder);
  });

  it('deletes nothing when the password is wrong', async () => {
    await mockUser('correcthorse1');
    await expect(authService.deleteAccount('u1', 'nope')).rejects.toMatchObject({ status: 403 });
    expect(Diagram.deleteMany).not.toHaveBeenCalled();
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it('deletes nothing when no password is supplied', async () => {
    await mockUser('correcthorse1');
    await expect(authService.deleteAccount('u1', undefined)).rejects.toMatchObject({ status: 403 });
    expect(User.deleteOne).not.toHaveBeenCalled();
  });
});

describe('authService.authenticate - failed-attempt hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports a wrong password for an existing account, with the same error as an unknown email', async () => {
    const hash = await bcrypt.hash('correcthorse1', 4);
    User.findOne.mockResolvedValue({ _id: 'u1', passwordHash: hash });
    const onFailedAttempt = jest.fn();

    await expect(authService.authenticate('a@b.com', 'wrong1234', { onFailedAttempt })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password.',
    });
    expect(onFailedAttempt).toHaveBeenCalledWith('u1');
  });

  it('does not call the hook for an unknown email', async () => {
    User.findOne.mockResolvedValue(null);
    const onFailedAttempt = jest.fn();
    await expect(authService.authenticate('x@y.com', 'whatever1', { onFailedAttempt })).rejects.toMatchObject({
      status: 401,
    });
    expect(onFailedAttempt).not.toHaveBeenCalled();
  });
});
