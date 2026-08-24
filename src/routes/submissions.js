const express = require('express');
const { body, param, query } = require('express-validator');

const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const {
  createSubmission, listSubmissions, getSubmission,
} = require('../controllers/submissionController');

const router = express.Router();

// matches the submissions.status DB check constraint
const STATUSES = [
  'pending', 'queued', 'compiling', 'running', 'judging',
  'accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded',
  'memory_limit_exceeded', 'compilation_error', 'internal_error',
];
const MAX_SOURCE = 100_000; // 100 KB source cap

const createRules = [
  body('problem_id').isInt({ min: 1 }).withMessage('problem_id must be a positive integer'),
  body('language_id').isInt({ min: 1 }).withMessage('language_id must be a positive integer'),
  body('source_code').isString().withMessage('source_code is required')
    .bail().isLength({ min: 1, max: MAX_SOURCE }).withMessage(`source_code must be 1–${MAX_SOURCE} characters`),
];

const listRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('status').optional().isIn(STATUSES).withMessage('invalid status filter'),
  query('problem_id').optional().isInt({ min: 1 }),
  query('user_id').optional().isInt({ min: 1 }),
];

const idRule = [param('id').isInt().withMessage('id must be an integer')];

router.post('/', authenticate, createRules, asyncHandler(createSubmission));
router.get('/', authenticate, listRules, asyncHandler(listSubmissions));
router.get('/:id', authenticate, idRule, asyncHandler(getSubmission));

module.exports = router;
