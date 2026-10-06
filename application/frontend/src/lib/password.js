// Mirrors the backend rule (utils/validators.js): 8-128 chars, at least one
// letter and one digit. Kept in one place so the signup form, the change-
// password form and the strength meter can never disagree with the API.
export const PASSWORD_RULES = [
  { id: 'len', label: '8+ characters', test: (p) => p.length >= 8 && p.length <= 128 },
  { id: 'letter', label: 'A letter', test: (p) => /[a-zA-Z]/.test(p) },
  { id: 'digit', label: 'A number', test: (p) => /[0-9]/.test(p) },
];

export function meetsPasswordRules(password) {
  return PASSWORD_RULES.every((r) => r.test(password));
}
