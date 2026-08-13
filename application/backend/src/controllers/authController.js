const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { isValidEmail, isValidPassword } = require('../utils/validators');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
  }
  if (!isValidPassword(password)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Password must be 8-128 characters and include at least one letter and one digit.',
    );
  }

  const user = await authService.registerUser(email, password);
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  const { token, user } = await authService.authenticate(email, password);
  res.status(200).json({ token, user });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  }
  res.status(200).json({ user });
});

module.exports = { register, login, me };
