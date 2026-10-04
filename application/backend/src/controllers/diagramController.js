const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { isValidObjectId } = require('../utils/validators');
const diagramService = require('../services/diagramService');
const { getTodayClaudeUsage } = require('../services/costGuard');
const { DIAGRAM_TYPES, MAX_TAGS, MAX_TAG_LENGTH } = require('../models/Diagram');
const activity = require('../services/activityService');

// Tags are normalised (trimmed, lower-cased, de-duplicated) so "Infra" and
// "infra " are one tag, and the library's tag filter matches predictably.
function normaliseTags(tags) {
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'tags must be an array of strings.');
  }
  const cleaned = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (cleaned.length > MAX_TAGS || cleaned.some((t) => t.length > MAX_TAG_LENGTH)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `At most ${MAX_TAGS} tags, each up to ${MAX_TAG_LENGTH} characters.`,
    );
  }
  return cleaned;
}

const generate = asyncHandler(async (req, res) => {
  const { text, diagramType } = req.body;

  if (typeof text !== 'string' || text.trim().length === 0 || text.length > 2000) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'text must be 1-2000 characters.');
  }
  if (diagramType !== undefined && !DIAGRAM_TYPES.includes(diagramType)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `diagramType must be one of: ${DIAGRAM_TYPES.join(', ')}`);
  }

  const result = await diagramService.generateDiagram(text.trim(), diagramType);
  res.status(201).json(result);
});

const save = asyncHandler(async (req, res) => {
  const { title, sourceText, diagramType, mermaidSyntax, providerUsed, generationMs } = req.body;

  if (typeof sourceText !== 'string' || sourceText.trim().length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'sourceText is required.');
  }
  if (!DIAGRAM_TYPES.includes(diagramType)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `diagramType must be one of: ${DIAGRAM_TYPES.join(', ')}`);
  }
  if (typeof mermaidSyntax !== 'string' || mermaidSyntax.trim().length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'mermaidSyntax is required.');
  }

  // userId comes from the verified JWT (req.userId), never from the
  // request body — see docs/adr/0006 and UC-2 in docs/functional-spec.md.
  const diagram = await diagramService.saveForUser(req.userId, {
    title,
    sourceText,
    diagramType,
    mermaidSyntax,
    providerUsed,
    generationMs,
  });
  await activity.record(req, req.userId, activity.ACTIONS.DIAGRAM_CREATE, { id: diagram._id, title: diagram.title });
  res.status(201).json(diagram);
});

const list = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filters = {};
  if (typeof req.query.q === 'string' && req.query.q.trim()) filters.q = req.query.q.trim().slice(0, 100);
  if (req.query.type !== undefined) {
    if (!DIAGRAM_TYPES.includes(req.query.type)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `type must be one of: ${DIAGRAM_TYPES.join(', ')}`);
    }
    filters.type = req.query.type;
  }
  if (typeof req.query.sort === 'string') filters.sort = req.query.sort;
  if (req.query.favorite === 'true') filters.favorite = true;
  if (typeof req.query.tag === 'string' && req.query.tag.trim()) filters.tag = req.query.tag.trim().toLowerCase();

  const result = await diagramService.listForUser(req.userId, page, limit, filters);
  res.status(200).json(result);
});

function assertValidId(id) {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid diagram id.');
  }
}

const getOne = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const diagram = await diagramService.findOwned(req.userId, req.params.id);
  res.status(200).json(diagram);
});

const update = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const { title, mermaidSyntax, isFavorite, tags } = req.body;
  if (isFavorite !== undefined && typeof isFavorite !== 'boolean') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'isFavorite must be a boolean.');
  }
  const updates = { title, mermaidSyntax, isFavorite };
  if (tags !== undefined) updates.tags = normaliseTags(tags);

  const diagram = await diagramService.updateOwned(req.userId, req.params.id, updates);
  // Starring is too frequent and too trivial to be worth an audit entry.
  if (title !== undefined || mermaidSyntax !== undefined || tags !== undefined) {
    await activity.record(req, req.userId, activity.ACTIONS.DIAGRAM_UPDATE, { id: diagram._id, title: diagram.title });
  }
  res.status(200).json(diagram);
});

const remove = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const deleted = await diagramService.deleteOwned(req.userId, req.params.id);
  await activity.record(req, req.userId, activity.ACTIONS.DIAGRAM_DELETE, { id: deleted._id, title: deleted.title });
  res.status(204).send();
});

const versions = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  res.status(200).json({ versions: await diagramService.listVersions(req.userId, req.params.id) });
});

const duplicate = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const copy = await diagramService.duplicateOwned(req.userId, req.params.id);
  await activity.record(req, req.userId, activity.ACTIONS.DIAGRAM_DUPLICATE, { id: copy._id, title: copy.title });
  res.status(201).json(copy);
});

const share = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const diagram = await diagramService.shareOwned(req.userId, req.params.id);
  await activity.record(req, req.userId, activity.ACTIONS.DIAGRAM_SHARE, { id: diagram._id, title: diagram.title });
  res.status(200).json({ shareToken: diagram.shareToken });
});

const unshare = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const diagram = await diagramService.unshareOwned(req.userId, req.params.id);
  await activity.record(req, req.userId, activity.ACTIONS.DIAGRAM_UNSHARE, { id: diagram._id, title: diagram.title });
  res.status(204).send();
});

const viewShared = asyncHandler(async (req, res) => {
  // Shared links are public and often embedded/bookmarked; a short cache
  // keeps repeat views cheap while a revoked link still dies within a minute.
  res.set('Cache-Control', 'public, max-age=60');
  res.status(200).json(await diagramService.findShared(req.params.token));
});

const listActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  res.status(200).json({ events: await activity.listForUser(req.userId, limit) });
});

const stats = asyncHandler(async (req, res) => {
  res.status(200).json(await diagramService.statsForUser(req.userId));
});

const providerStatus = asyncHandler(async (req, res) => {
  res.status(200).json(await getTodayClaudeUsage());
});

module.exports = {
  generate,
  save,
  list,
  stats,
  getOne,
  update,
  remove,
  versions,
  duplicate,
  share,
  unshare,
  viewShared,
  listActivity,
  providerStatus,
};
