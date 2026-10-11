const mongoose = require('mongoose');

// Must match the styles the frontend can render (src/lib/avatars.js).
const AVATAR_STYLES = ['notionists', 'lorelei', 'openPeeps', 'shapes'];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // Optional display name for the profile page. Email stays the login
    // identifier; this is presentation only, so it is never used in queries.
    name: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    // Generated-avatar choice. Only the recipe is stored (style + seed); the
    // image itself is rendered in the browser, so no files are uploaded or
    // served and no third-party avatar service is ever called.
    avatar: {
      _id: false,
      style: { type: String, enum: AVATAR_STYLES },
      seed: { type: String, maxlength: 64 },
    },
  },
  { timestamps: true },
);

// toJSON strips passwordHash automatically, so a careless res.json(user)
// can never leak it — the safe behavior is the default, not something to remember.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.AVATAR_STYLES = AVATAR_STYLES;
