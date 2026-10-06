const ActivityEvent = require('../models/ActivityEvent');

const ACTIONS = Object.freeze({
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  PASSWORD_CHANGE: 'auth.password_change',
  PROFILE_UPDATE: 'profile.update',
  DATA_EXPORT: 'account.export',
  DIAGRAM_CREATE: 'diagram.create',
  DIAGRAM_UPDATE: 'diagram.update',
  DIAGRAM_DELETE: 'diagram.delete',
  DIAGRAM_DUPLICATE: 'diagram.duplicate',
  DIAGRAM_SHARE: 'diagram.share',
  DIAGRAM_UNSHARE: 'diagram.unshare',
});

// Best-effort by design: an audit-log write failing must never fail the
// user's actual request (a login should not 500 because the activity
// collection is briefly unavailable). Failures are logged instead.
async function record(req, userId, action, target = {}) {
  try {
    await ActivityEvent.create({
      userId,
      action,
      targetId: target.id ? String(target.id) : undefined,
      targetTitle: target.title ? String(target.title).slice(0, 120) : undefined,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent')?.slice(0, 200),
    });
  } catch (err) {
    console.error(JSON.stringify({ level: 'warn', requestId: req?.id, message: `activity log write failed: ${err.message}` }));
  }
}

async function listForUser(userId, limit = 50) {
  return ActivityEvent.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

async function deleteForUser(userId) {
  await ActivityEvent.deleteMany({ userId });
}

module.exports = { ACTIONS, record, listForUser, deleteForUser };
