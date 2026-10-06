import { twMerge } from 'tailwind-merge';

// Joins class names, skipping falsy values, and resolves Tailwind conflicts
// so a caller's override actually wins: cn('w-full', 'w-auto') -> 'w-auto',
// cn('inline-flex', 'hidden sm:inline-flex') -> 'hidden sm:inline-flex'.
// Plain string-joining would keep both and let CSS source order decide.
export function cn(...classes) {
  return twMerge(classes.filter(Boolean).join(' '));
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function timeAgo(date) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export function formatDate(date, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  return new Date(date).toLocaleDateString(undefined, opts);
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function initials(nameOrEmail = '') {
  const source = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function displayName(user) {
  return user?.name?.trim() || user?.email?.split('@')[0] || 'there';
}

// Turns a title into a safe download filename.
export function slugify(text, fallback = 'diagram') {
  const slug = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

// Very small user-agent summary for the activity log - enough to tell
// "Chrome on Windows" from "Safari on iPhone", not a full UA parser.
export function describeUserAgent(ua = '') {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : /curl|node|axios|supertest/i.test(ua)
            ? 'API client'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';
