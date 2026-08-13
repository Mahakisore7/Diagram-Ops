const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const SALT_ROUNDS = 12;

async function registerUser(email, password) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email: email.toLowerCase(), passwordHash });
  return user;
}

// Both failure branches below throw the identical error. Distinguishing
// "no such email" from "wrong password" would let an attacker enumerate
// which email addresses have accounts — see docs/adr/0006 for the same
// reasoning applied to diagram ownership.
async function authenticate(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() });
  const invalidCredentials = () =>
    new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password.');

  if (!user) throw invalidCredentials();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw invalidCredentials();

  const token = jwt.sign({ sub: user._id.toString() }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, user };
}

async function getUserById(id) {
  return User.findById(id);
}

module.exports = { registerUser, authenticate, getUserById };
