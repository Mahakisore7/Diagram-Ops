const mongoose = require('mongoose');

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
