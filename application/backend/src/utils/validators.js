// Pragmatic checks, not full RFC 5322 — good enough to catch typos and
// garbage input before it reaches the database. See docs/functional-spec.md §7.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

function isValidObjectId(id) {
  return typeof id === 'string' && OBJECT_ID_RE.test(id);
}

module.exports = { isValidEmail, isValidPassword, isValidObjectId };
