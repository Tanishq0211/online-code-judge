const express = require('express');
const { body, param } = require('express-validator');

const prisma = require('../lib/prisma');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const { isPrivileged } = require('../lib/roles');
const {
  listTestCases, createTestCase, updateTestCase, deleteTestCase,
} = require('../controllers/testCaseController');

// mergeParams so we can read :slug from the parent problems router.
const router = express.Router({ mergeParams: true });
const MUTATE_ROLES = ['moderator', 'admin'];

// Resolve the parent problem from :slug and enforce its visibility.
// Hidden problems are 404 for non-privileged callers (don't reveal existence).
async function loadProblem(req, res, next) {
  const problem = await prisma.problems.findUnique({ where: { slug: req.params.slug } });
  if (!problem || (!problem.is_public && !isPrivileged(req))) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  req.problem = problem;
  next();
}

// input/expected_output are required strings; "" is allowed (a program may read/print nothing).
const createRules = [
  body('input').isString().withMessage('input is required (string)'),
  body('expected_output').isString().withMessage('expected_output is required (string)'),
  body('is_visible').optional().isBoolean().withMessage('is_visible must be a boolean').toBoolean(),
  body('order_index').optional().isInt({ min: 1 }).withMessage('order_index must be a positive integer').toInt(),
];

const updateRules = [
  param('id').isInt().withMessage('id must be an integer'),
  body('input').optional().isString(),
  body('expected_output').optional().isString(),
  body('is_visible').optional().isBoolean().withMessage('is_visible must be a boolean').toBoolean(),
  body('order_index').optional().isInt({ min: 1 }).withMessage('order_index must be a positive integer').toInt(),
];

const idRule = [param('id').isInt().withMessage('id must be an integer')];

router.get('/', optionalAuth, asyncHandler(loadProblem), asyncHandler(listTestCases));
router.post('/', authenticate, authorize(MUTATE_ROLES), asyncHandler(loadProblem), createRules, asyncHandler(createTestCase));
router.patch('/:id', authenticate, authorize(MUTATE_ROLES), asyncHandler(loadProblem), updateRules, asyncHandler(updateTestCase));
router.delete('/:id', authenticate, authorize(MUTATE_ROLES), asyncHandler(loadProblem), idRule, asyncHandler(deleteTestCase));

module.exports = router;
