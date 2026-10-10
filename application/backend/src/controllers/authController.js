const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { isValidEmail, isValidPassword } = require('../utils/validators');
const authService = require('../services/authService');
const { AVATAR_STYLES } = require('../models/User');
const activity = require('../services/activityService');

const MAX_NAME_LENGTH = 80;

function validateName(name) {
  if (name !== undefined && (typeof name !== 'string' || name.trim().length > MAX_NAME_LENGTH)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `name must be a string of at most ${MAX_NAME_LENGTH} characters.`);
  }
}

const PASSWORD_RULE_MESSAGE = 'Password must be 8-128 characters and include at least one letter and one digit.';

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!isValidEmail(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
  }
  if (!isValidPassword(password)) {
    throw new ApiError(400, 'VALIDATION_ERROR', PASSWORD_RULE_MESSAGE);
  }
  validateName(name);

  const user = await authService.registerUser(email, password, name?.trim() || '');
  await activity.record(req, user._id, activity.ACTIONS.REGISTER);
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  const { token, user } = await authService.authenticate(email, password, {
    onFailedAttempt: (userId) => activity.record(req, userId, activity.ACTIONS.LOGIN_FAILED),
  });
  await activity.record(req, user._id, activity.ACTIONS.LOGIN);
  res.status(200).json({ token, user });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  }
  res.status(200).json({ user });
});

// Avatar is a style from a fixed list plus a short seed string. Validated
// here so a bad value is a clear 400, not a Mongoose enum error (500).
function validateAvatar(avatar) {
  if (avatar === undefined) return;
  const ok =
    avatar &&
    typeof avatar === 'object' &&
    AVATAR_STYLES.includes(avatar.style) &&
    typeof avatar.seed === 'string' &&
    avatar.seed.length > 0 &&
    avatar.seed.length <= 64;
  if (!ok) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `avatar must be { style: one of ${AVATAR_STYLES.join(', ')}, seed: 1-64 characters }.`,
    );
  }
}

const updateMe = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  validateName(name);
  validateAvatar(avatar);
  const user = await authService.updateProfile(req.userId, {
    name: name?.trim(),
    avatar: avatar && { style: avatar.style, seed: avatar.seed },
  });
  await activity.record(req, req.userId, activity.ACTIONS.PROFILE_UPDATE);
  res.status(200).json({ user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!isValidPassword(newPassword)) {
    throw new ApiError(400, 'VALIDATION_ERROR', PASSWORD_RULE_MESSAGE);
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'New password must be different from the current one.');
  }
  await authService.changePassword(req.userId, currentPassword, newPassword);
  await activity.record(req, req.userId, activity.ACTIONS.PASSWORD_CHANGE);
  res.status(204).send();
});

const deleteMe = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.userId, req.body?.password);
  res.status(204).send();
});

const exportMe = asyncHandler(async (req, res) => {
  const data = await authService.exportAccount(req.userId);
  await activity.record(req, req.userId, activity.ACTIONS.DATA_EXPORT);
  res.set('Content-Disposition', 'attachment; filename="diagramforge-export.json"');
  res.status(200).json(data);
});

module.exports = { register, login, me, updateMe, changePassword, deleteMe, exportMe };
