const Diagram = require('../models/Diagram');
const ApiError = require('../utils/ApiError');
const { generateWithFallback, generateWithProvider } = require('./providers');

const DIAGRAM_TYPES = Diagram.DIAGRAM_TYPES;

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
  });
}

async function listForUser(userId, page, limit) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Diagram.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Diagram.countDocuments({ userId }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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

async function updateOwned(userId, id, updates) {
  const diagram = await findOwned(userId, id);
  if (updates.title !== undefined) diagram.title = updates.title;
  if (updates.mermaidSyntax !== undefined) diagram.mermaidSyntax = updates.mermaidSyntax;
  await diagram.save();
  return diagram;
}

async function deleteOwned(userId, id) {
  const result = await Diagram.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw new ApiError(404, 'NOT_FOUND', 'Diagram not found.');
}

module.exports = {
  generateDiagram,
  saveForUser,
  listForUser,
  findOwned,
  updateOwned,
  deleteOwned,
  extractJSON,
  validateSyntax,
  buildSystemPrompt,
};
