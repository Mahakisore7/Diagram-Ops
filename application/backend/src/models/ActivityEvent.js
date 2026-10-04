const mongoose = require('mongoose');

const RETENTION_DAYS = 90;

// Per-user audit trail: sign-ins (including failed ones), password and
// profile changes, and diagram lifecycle events. Shown back to the user on
// the Activity and Security pages so they can spot access they don't
// recognise. Holds no diagram content - only what happened, to what, and
// from where.
const activityEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetId: { type: String },
    targetTitle: { type: String, maxlength: 120 },
    ip: { type: String },
    userAgent: { type: String, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityEventSchema.index({ userId: 1, createdAt: -1 });
// TTL index: MongoDB deletes events older than the retention window on its
// own, so the collection cannot grow without bound.
activityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

activityEventSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
module.exports.RETENTION_DAYS = RETENTION_DAYS;
