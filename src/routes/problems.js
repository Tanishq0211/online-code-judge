const express = require('express');
const { body, param, query } = require('express-validator');

const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const {
  listProblems, getProblem, createProblem, updateProblem, deleteProblem,
} = require('../controllers/problemController');
const testCasesRouter = require('./testCases');

const router = express.Router();

const DIFFICULTIES = ['easy', 'medium', 'hard']; // matches DB check constraint
const MUTATE_ROLES = ['moderator', 'admin'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ----- reusable field validators -----
const slugRule = (chain) =>
  chain.trim()
    .isLength({ min: 1, max: 150 }).withMessage('Slug must be 1–150 characters')
    .matches(SLUG_RE).withMessage('Slug must be lowercase alphanumeric words separated by hyphens');

const listRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('difficulty').optional().isIn(DIFFICULTIES).withMessage(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`),
  query('search').optional().trim().isLength({ max: 100 }),
];

const createRules = [
  slugRule(body('slug')),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 chars)'),
  body('statement').trim().notEmpty().withMessage('Statement is required'),
  body('difficulty').isIn(DIFFICULTIES).withMessage(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`),
  body('time_limit_ms').optional().isInt({ min: 1 }).withMessage('time_limit_ms must be a positive integer').toInt(),
  body('memory_limit_mb').optional().isInt({ min: 1 }).withMessage('memory_limit_mb must be a positive integer').toInt(),
  body('is_public').optional().isBoolean().withMessage('is_public must be a boolean').toBoolean(),
  body(['input_format', 'output_format', 'constraints']).optional({ nullable: true }).isString(),
];

const updateRules = [
  param('id').isInt().withMessage('id must be an integer'),
  slugRule(body('slug').optional()),
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('statement').optional().trim().notEmpty(),
  body('difficulty').optional().isIn(DIFFICULTIES).withMessage(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`),
  body('time_limit_ms').optional().isInt({ min: 1 }).toInt(),
  body('memory_limit_mb').optional().isInt({ min: 1 }).toInt(),
  body('is_public').optional().isBoolean().toBoolean(),
  body(['input_format', 'output_format', 'constraints']).optional({ nullable: true }).isString(),
];

const idRule = [param('id').isInt().withMessage('id must be an integer')];

// ----- routes -----
router.get('/', optionalAuth, listRules, asyncHandler(listProblems));
router.get('/:slug', optionalAuth, asyncHandler(getProblem));
router.post('/', authenticate, authorize(MUTATE_ROLES), createRules, asyncHandler(createProblem));
router.patch('/:id', authenticate, authorize(MUTATE_ROLES), updateRules, asyncHandler(updateProblem));
router.delete('/:id', authenticate, authorize(MUTATE_ROLES), idRule, asyncHandler(deleteProblem));

// Nested test-case routes: /api/problems/:slug/test-cases (see routes/testCases.js)
router.use('/:slug/test-cases', testCasesRouter);

module.exports = router;
