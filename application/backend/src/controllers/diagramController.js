const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { isValidObjectId } = require('../utils/validators');
const diagramService = require('../services/diagramService');
const { getTodayClaudeUsage } = require('../services/costGuard');
const { DIAGRAM_TYPES } = require('../models/Diagram');

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
  res.status(201).json(diagram);
});

const list = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const result = await diagramService.listForUser(req.userId, page, limit);
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
  const { title, mermaidSyntax } = req.body;
  const diagram = await diagramService.updateOwned(req.userId, req.params.id, { title, mermaidSyntax });
  res.status(200).json(diagram);
});

const remove = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  await diagramService.deleteOwned(req.userId, req.params.id);
  res.status(204).send();
});

const providerStatus = asyncHandler(async (req, res) => {
  res.status(200).json(await getTodayClaudeUsage());
});

module.exports = { generate, save, list, getOne, update, remove, providerStatus };
