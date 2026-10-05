const crypto = require('crypto');
const mongoose = require('mongoose');
const Diagram = require('../models/Diagram');
const ApiError = require('../utils/ApiError');
const { generateWithFallback, generateWithProvider } = require('./providers');

const DIAGRAM_TYPES = Diagram.DIAGRAM_TYPES;
const MAX_VERSIONS = Diagram.MAX_VERSIONS || 20;

const SYNTAX_MARKERS = {
  flowchart: /^\s*(flowchart|graph)\s/i,
  sequence: /^\s*sequenceDiagram/i,
  class: /^\s*classDiagram/i,
  er: /^\s*erDiagram/i,
  state: /^\s*stateDiagram(-v2)?/i,
  gantt: /^\s*gantt/i,
  mindmap: /^\s*mindmap/i,
};

function buildSystemPrompt(requestedType) {
  const typeInstruction = requestedType
    ? `The user has requested a "${requestedType}" diagram — use exactly that type.`
    : 'Infer the single most appropriate diagram type from the description.';

  return [
    'You are a diagram generation assistant. Convert the user\'s plain-English',
    'description into a Mermaid diagram.',
    '',
    typeInstruction,
    '',
    'Supported diagram types and their required Mermaid opening keyword:',
    '- flowchart -> "flowchart TD" (or LR)',
    '- sequence  -> "sequenceDiagram"',
    '- class     -> "classDiagram"',
    '- er        -> "erDiagram"',
    '- state     -> "stateDiagram-v2"',
    '- gantt     -> "gantt"',
    '- mindmap   -> "mindmap"',
    '',
    'Respond with ONLY a JSON object, no markdown code fences, no commentary,',
    'in exactly this shape:',
    '{"diagramType": "<one of the seven types above>", "title": "<a short descriptive title, under 120 characters>", "mermaidSyntax": "<valid Mermaid syntax, starting with the required keyword for the type>"}',
  ].join('\n');
}

// Handles all four shapes documented in tests/extractJSON cases: plain
// JSON, ```json fenced, bare ``` fenced, and surrounding whitespace.
function extractJSON(raw) {
  if (typeof raw !== 'string') throw new Error('Provider response was not text.');
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

function validateSyntax(diagramType, mermaidSyntax) {
  const marker = SYNTAX_MARKERS[diagramType];
  return Boolean(marker && typeof mermaidSyntax === 'string' && marker.test(mermaidSyntax));
}

function isWellFormed(parsed) {
  return (
    parsed &&
    DIAGRAM_TYPES.includes(parsed.diagramType) &&
    typeof parsed.title === 'string' &&
    parsed.title.length > 0 &&
    validateSyntax(parsed.diagramType, parsed.mermaidSyntax)
  );
}

// See docs/system-design.md §6 (activity diagram) and §5.2 (sequence
// diagrams) — this function IS that diagram. One retry budget, shared
// across "unparseable JSON" and "syntax doesn't match declared type",
// always sticky (docs/adr/0003): the retry hits the SAME provider that
// produced the bad output, never the fallback cascade.
async function generateDiagramContent(sourceText, requestedType) {
  const systemPrompt = buildSystemPrompt(requestedType);
  let messages = [{ role: 'user', content: sourceText }];
  let { text, providerUsed } = await generateWithFallback(systemPrompt, messages);

  for (let attempt = 0; attempt <= 1; attempt++) {
    let parsed = null;
    try {
      parsed = extractJSON(text);
    } catch {
      parsed = null;
    }

    if (isWellFormed(parsed)) {
      return { diagramType: parsed.diagramType, title: parsed.title, mermaidSyntax: parsed.mermaidSyntax, providerUsed };
    }

    if (attempt === 1) {
      throw new ApiError(
        502,
        'LLM_INVALID_OUTPUT',
        'The AI provider returned output we could not use, even after a retry.',
      );
    }

    messages = [
      { role: 'user', content: sourceText },
      { role: 'assistant', content: text },
      {
        role: 'user',
        content:
          'That response was not valid. Return ONLY a JSON object with diagramType, title, ' +
          'and mermaidSyntax, where mermaidSyntax begins with the exact Mermaid keyword for ' +
          'diagramType. No markdown fences, no commentary.',
      },
    ];
    text = await generateWithProvider(providerUsed, systemPrompt, messages);
  }

  // Unreachable — the loop above always returns or throws — but keeps the
  // function's control flow explicit rather than implicitly returning undefined.
  throw new ApiError(502, 'LLM_INVALID_OUTPUT', 'Unexpected generation failure.');
}

async function generateDiagram(sourceText, requestedType) {
  const start = Date.now();
  const result = await generateDiagramContent(sourceText, requestedType);
  return { ...result, generationMs: Date.now() - start };
}

function deriveTitle(sourceText) {
  const trimmed = sourceText.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 50) : 'Untitled diagram';
}

async function saveForUser(userId, dto) {
  const title = dto.title && dto.title.trim().length > 0 ? dto.title.trim() : deriveTitle(dto.sourceText);
  return Diagram.create({
    userId,
    title,
    sourceText: dto.sourceText,
    diagramType: dto.diagramType,
    mermaidSyntax: dto.mermaidSyntax,
    providerUsed: dto.providerUsed,
    generationMs: dto.generationMs,
    tags: dto.tags || [],
  });
}

// Escapes regex metacharacters so a search box value is matched literally.
// Without this, a query like "(a+)+$" would be compiled as a regex against
// every title - user-controlled ReDoS against the database.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated: { updatedAt: -1 },
  title: { title: 1 },
};

async function listForUser(userId, page, limit, filters = {}) {
  const skip = (page - 1) * limit;
  // userId is always the first condition, so every variant of this query
  // still uses the { userId, createdAt } compound index prefix.
  const query = { userId };
  if (filters.type) query.diagramType = filters.type;
  if (filters.favorite) query.isFavorite = true;
  if (filters.tag) query.tags = filters.tag;
  if (filters.q) query.title = { $regex: escapeRegex(filters.q), $options: 'i' };
  const sort = SORTS[filters.sort] || SORTS.newest;

  const [data, total] = await Promise.all([
    Diagram.find(query).sort(sort).skip(skip).limit(limit),
    Diagram.countDocuments(query),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Dashboard summary for one user, computed in MongoDB with a single
// aggregation ($facet) instead of pulling every diagram into Node.
async function statsForUser(userId, days = 14) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const [result] = await Diagram.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    {
      $facet: {
        totals: [{ $group: { _id: null, total: { $sum: 1 }, avgGenerationMs: { $avg: '$generationMs' } } }],
        byType: [{ $group: { _id: '$diagramType', count: { $sum: 1 } } }],
        byProvider: [{ $group: { _id: '$providerUsed', count: { $sum: 1 } } }],
        favorites: [{ $match: { isFavorite: true } }, { $count: 'count' }],
        shared: [{ $match: { shareToken: { $exists: true } } }, { $count: 'count' }],
        tags: [
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 50 },
        ],
        daily: [
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const toMap = (rows) => Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]));
  const dailyMap = toMap(result.daily);

  // Zero-filled so the dashboard chart always has one bar per day.
  const activity = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    activity.push({ date: key, count: dailyMap[key] || 0 });
  }

  const totals = result.totals[0] || { total: 0, avgGenerationMs: null };
  return {
    total: totals.total,
    avgGenerationMs: totals.avgGenerationMs === null ? null : Math.round(totals.avgGenerationMs),
    byType: toMap(result.byType),
    byProvider: toMap(result.byProvider),
    favorites: result.favorites[0]?.count || 0,
    shared: result.shared[0]?.count || 0,
    tags: result.tags.map((t) => ({ tag: t._id, count: t.count })),
    activity,
  };
}

// A single query filtered on BOTH _id and userId — not "fetch by id, then
// check ownership in an if-statement" — so there is no separate code path
// to forget the ownership check on. Doesn't-exist and not-yours collapse
// into the same 404 by construction. See docs/adr/0006.
async function findOwned(userId, id) {
  const diagram = await Diagram.findOne({ _id: id, userId });
  if (!diagram) throw new ApiError(404, 'NOT_FOUND', 'Diagram not found.');
  return diagram;
}

// Like findOwned, but also loads the version history that updateOwned
// appends to - findOwned stays lean for the common read path.
async function findOwnedWithVersions(userId, id) {
  const diagram = await Diagram.findOne({ _id: id, userId }).select('+versions');
  if (!diagram) throw new ApiError(404, 'NOT_FOUND', 'Diagram not found.');
  return diagram;
}

// Snapshots the CURRENT state before it is overwritten, so every version in
// the history is something the user actually saw saved. Metadata-only
// edits (favourite, tags) don't create versions - only content does.
async function updateOwned(userId, id, updates) {
  const diagram = await findOwnedWithVersions(userId, id);

  const titleChanged = updates.title !== undefined && updates.title !== diagram.title;
  const syntaxChanged = updates.mermaidSyntax !== undefined && updates.mermaidSyntax !== diagram.mermaidSyntax;
  if (titleChanged || syntaxChanged) {
    diagram.versions.push({ title: diagram.title, mermaidSyntax: diagram.mermaidSyntax, savedAt: diagram.updatedAt });
    if (diagram.versions.length > MAX_VERSIONS) {
      diagram.versions.splice(0, diagram.versions.length - MAX_VERSIONS);
    }
  }

  if (updates.title !== undefined) diagram.title = updates.title;
  if (updates.mermaidSyntax !== undefined) diagram.mermaidSyntax = updates.mermaidSyntax;
  if (updates.isFavorite !== undefined) diagram.isFavorite = updates.isFavorite;
  if (updates.tags !== undefined) diagram.tags = updates.tags;
  await diagram.save();

  const json = diagram.toJSON();
  delete json.versions;
  return json;
}

async function listVersions(userId, id) {
  const diagram = await findOwnedWithVersions(userId, id);
  // Newest first for display; index is the position in that list.
  return [...diagram.versions].reverse();
}

async function duplicateOwned(userId, id) {
  const source = await findOwned(userId, id);
  const title = `${source.title} (copy)`.slice(0, 120);
  return Diagram.create({
    userId,
    title,
    sourceText: source.sourceText,
    diagramType: source.diagramType,
    mermaidSyntax: source.mermaidSyntax,
    providerUsed: source.providerUsed,
    generationMs: source.generationMs,
    tags: source.tags,
  });
}

async function deleteOwned(userId, id) {
  const diagram = await Diagram.findOneAndDelete({ _id: id, userId });
  if (!diagram) throw new ApiError(404, 'NOT_FOUND', 'Diagram not found.');
  return diagram;
}

// 144 bits from the OS CSPRNG, base64url-encoded to 24 URL-safe characters.
// Unguessable in practice, so the token itself is the only credential a
// public link needs.
function newShareToken() {
  return crypto.randomBytes(18).toString('base64url');
}

async function shareOwned(userId, id) {
  const diagram = await findOwned(userId, id);
  if (!diagram.shareToken) {
    diagram.shareToken = newShareToken();
    await diagram.save();
  }
  return diagram;
}

async function unshareOwned(userId, id) {
  const diagram = await findOwned(userId, id);
  diagram.shareToken = undefined;
  await diagram.save();
  return diagram;
}

const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

// Public read path. Returns only what a viewer needs to render the diagram -
// never the owner, the original prompt, or anything else about the account.
async function findShared(token) {
  if (typeof token !== 'string' || !SHARE_TOKEN_RE.test(token)) {
    throw new ApiError(404, 'NOT_FOUND', 'This link is invalid or has been revoked.');
  }
  const diagram = await Diagram.findOne({ shareToken: token });
  if (!diagram) throw new ApiError(404, 'NOT_FOUND', 'This link is invalid or has been revoked.');
  return {
    title: diagram.title,
    diagramType: diagram.diagramType,
    mermaidSyntax: diagram.mermaidSyntax,
    updatedAt: diagram.updatedAt,
  };
}

module.exports = {
  generateDiagram,
  saveForUser,
  listForUser,
  statsForUser,
  findOwned,
  updateOwned,
  deleteOwned,
  listVersions,
  duplicateOwned,
  shareOwned,
  unshareOwned,
  findShared,
  extractJSON,
  validateSyntax,
  buildSystemPrompt,
};
