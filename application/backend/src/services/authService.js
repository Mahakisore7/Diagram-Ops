const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Diagram = require('../models/Diagram');
const ActivityEvent = require('../models/ActivityEvent');
const ApiError = require('../utils/ApiError');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const SALT_ROUNDS = 12;

async function registerUser(email, password, name = '') {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email: email.toLowerCase(), passwordHash, name });
  return user;
}

// Both failure branches below throw the identical error. Distinguishing
// "no such email" from "wrong password" would let an attacker enumerate
// which email addresses have accounts — see docs/adr/0006 for the same
// reasoning applied to diagram ownership.
// onFailedAttempt is called with the account's id when the email exists but
// the password is wrong, so the real owner can see the attempt in their
// activity log. The response to the caller stays identical either way.
async function authenticate(email, password, { onFailedAttempt } = {}) {
  const user = await User.findOne({ email: email.toLowerCase() });
  const invalidCredentials = () =>
    new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password.');

  if (!user) throw invalidCredentials();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await onFailedAttempt?.(user._id);
    throw invalidCredentials();
  }

  const token = jwt.sign({ sub: user._id.toString() }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, user };
}

async function getUserById(id) {
  return User.findById(id);
}

async function updateProfile(userId, { name, avatar }) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  await user.save();
  return user;
}

// Re-checks the current password even though the caller already holds a
// valid JWT: a stolen or unattended session token alone must not be enough
// to lock the real owner out of their account.
async function verifyCurrentPassword(userId, password) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  const valid = typeof password === 'string' && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new ApiError(403, 'INVALID_PASSWORD', 'Current password is incorrect.');
  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await verifyCurrentPassword(userId, currentPassword);
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

// Deletes the user's diagrams before the user, so a failure part-way
// leaves an account with fewer diagrams rather than orphaned diagrams
// whose owner no longer exists.
async function deleteAccount(userId, password) {
  const user = await verifyCurrentPassword(userId, password);
  await Diagram.deleteMany({ userId: user._id });
  await ActivityEvent.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
}

// Everything stored about the account, minus credentials, as one JSON
// document the user can download (data portability).
async function exportAccount(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  const diagrams = await Diagram.find({ userId }).sort({ createdAt: 1 }).select('-shareToken');
  return {
    exportedAt: new Date().toISOString(),
    format: 'diagramforge-export/v1',
    account: user.toJSON(),
    diagrams: diagrams.map((d) => d.toJSON()),
  };
}

module.exports = {
  exportAccount,
  registerUser,
  authenticate,
  getUserById,
  updateProfile,
  changePassword,
  deleteAccount,
};
