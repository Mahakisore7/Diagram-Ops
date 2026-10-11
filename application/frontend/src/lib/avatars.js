import { createAvatar } from '@dicebear/core';
// Individual style packages, not @dicebear/collection: the collection
// bundles every style (~600 KB) where we only offer four.
import * as notionists from '@dicebear/notionists';
import * as lorelei from '@dicebear/lorelei';
import * as openPeeps from '@dicebear/open-peeps';
import * as shapes from '@dicebear/shapes';

// Generated avatars, rendered entirely in the browser (DiceBear). Only the
// recipe { style, seed } is stored on the user, so there are no uploads,
// no image hosting and no third-party avatar requests - and the CSP's
// img-src 'self' data: already covers the data: URIs produced here.
// Keys must match AVATAR_STYLES in the backend's models/User.js.
export const AVATAR_STYLES = {
  notionists: { label: 'Sketch', style: notionists },
  lorelei: { label: 'Portrait', style: lorelei },
  openPeeps: { label: 'Peeps', style: openPeeps },
  shapes: { label: 'Geometric', style: shapes },
};

export const DEFAULT_STYLE = 'notionists';

// Drafting-paper tones, so every avatar sits on the same stock.
const BACKGROUNDS = ['f6f3ec', 'eeeae0', 'fbe0d4', 'd8e4ee', 'e0d9cb'];

const cache = new Map();

export function avatarDataUri(style, seed) {
  const key = `${style}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const def = AVATAR_STYLES[style] || AVATAR_STYLES[DEFAULT_STYLE];
  const uri = createAvatar(def.style, { seed, backgroundColor: BACKGROUNDS }).toDataUri();
  cache.set(key, uri);
  return uri;
}

export function userAvatar(user) {
  const style = user?.avatar?.style || DEFAULT_STYLE;
  const seed = user?.avatar?.seed || user?.email || 'guest';
  return avatarDataUri(style, seed);
}

export function randomSeed() {
  const words = ['atlas', 'vector', 'lumen', 'graph', 'quill', 'delta', 'orbit', 'cobalt', 'ember', 'nimbus', 'pivot', 'sable'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.random().toString(36).slice(2, 7)}`;
}
