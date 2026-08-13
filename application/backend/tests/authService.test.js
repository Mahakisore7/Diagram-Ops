jest.mock('../src/models/User');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const authService = require('../src/services/authService');

describe('authService.registerUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a user with a bcrypt hash, never the plaintext password', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation((doc) => Promise.resolve({ _id: 'u1', ...doc }));

    await authService.registerUser('New@Example.com', 'correcthorse1');

    const [createArg] = User.create.mock.calls[0];
    expect(createArg.email).toBe('new@example.com');
    expect(createArg.passwordHash).not.toBe('correcthorse1');
    expect(createArg.passwordHash).toMatch(/^\$2[aby]\$12\$/); // bcrypt, cost 12
  });

  it('rejects registration when the email is already in use (FR-A5)', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(authService.registerUser('taken@example.com', 'correcthorse1')).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_IN_USE',
    });
  });
});

describe('authService.authenticate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('issues a JWT for correct credentials', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('correcthorse1', 12);
    User.findOne.mockResolvedValue({ _id: 'u1', email: 'a@b.com', passwordHash: hash });

    const { token, user } = await authService.authenticate('a@b.com', 'correcthorse1');

    expect(user._id).toBe('u1');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe('u1');
  });

  it('returns the SAME error for a nonexistent email as for a wrong password', async () => {
    User.findOne.mockResolvedValue(null);
    let errNoUser;
    try {
      await authService.authenticate('nobody@example.com', 'whatever1');
    } catch (e) {
      errNoUser = e;
    }

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('correcthorse1', 12);
    User.findOne.mockResolvedValue({ _id: 'u1', passwordHash: hash });
    let errWrongPassword;
    try {
      await authService.authenticate('a@b.com', 'wrongpassword1');
    } catch (e) {
      errWrongPassword = e;
    }

    expect(errNoUser.status).toBe(401);
    expect(errWrongPassword.status).toBe(401);
    expect(errNoUser.message).toBe(errWrongPassword.message);
  });
});
