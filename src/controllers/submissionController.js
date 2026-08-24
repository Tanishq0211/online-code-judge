const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');
const { isPrivileged } = require('../lib/roles');

// BigInt columns can't be JSON-serialized — stringify them.
function serialize(s) {
  return {
    ...s,
    id: s.id.toString(),
    user_id: s.user_id.toString(),
    problem_id: s.problem_id.toString(),
    language_id: s.language_id.toString(),
  };
}
function serializeResult(r) {
  return {
    ...r,
    id: r.id.toString(),
    submission_id: r.submission_id.toString(),
    test_case_id: r.test_case_id.toString(),
  };
}

/**
 * POST /api/submissions  (any authenticated user)
 * Body: { problem_id, language_id, source_code }
 * Created with status 'queued'. ponytail: judging is deferred to a separate worker
 * (Phase 5b) that claims 'queued' rows, runs them Docker-sandboxed against the test
 * cases, writes submission_test_results, and sets the final status. Judging is slow
 * and must be concurrency-bounded, so it stays out of this request path on purpose.
 */
async function createSubmission(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Parse from the original strings (not .toInt()) to keep BigInt precision.
  const problem_id = BigInt(req.body.problem_id);
  const language_id = BigInt(req.body.language_id);

  const problem = await prisma.problems.findUnique({ where: { id: problem_id } });
  if (!problem || (!problem.is_public && !isPrivileged(req))) {
    return res.status(404).json({ error: 'Problem not found' }); // don't reveal hidden problems
  }
  const language = await prisma.languages.findUnique({ where: { id: language_id } });
  if (!language) return res.status(400).json({ error: 'Unknown language_id' });

  const submission = await prisma.submissions.create({
    data: {
      user_id: BigInt(req.user.userId),
      problem_id,
      language_id,
      source_code: req.body.source_code,
      status: 'queued',
    },
  });
  res.status(201).json({ submission: serialize(submission) });
}

/**
 * GET /api/submissions  (any authenticated user)
 * Users see only their own; mod/admin see all and may filter by user_id.
 * Query: page, limit, status, problem_id, user_id (privileged only).
 */
async function listSubmissions(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const where = {};
  if (!isPrivileged(req)) {
    where.user_id = BigInt(req.user.userId); // non-privileged: own submissions only
  } else if (req.query.user_id) {
    where.user_id = BigInt(req.query.user_id);
  }
  if (req.query.problem_id) where.problem_id = BigInt(req.query.problem_id);
  if (req.query.status) where.status = req.query.status;

  const [total, rows] = await Promise.all([
    prisma.submissions.count({ where }),
    prisma.submissions.findMany({
      where,
      orderBy: { submitted_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      // omit source_code (can be large) from the list view
      select: {
        id: true, user_id: true, problem_id: true, language_id: true,
        status: true, runtime_ms: true, memory_kb: true,
        submitted_at: true, completed_at: true,
      },
    }),
  ]);

  res.json({
    data: rows.map(serialize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * GET /api/submissions/:id  (owner or mod/admin)
 * Full detail incl. source_code and per-test results.
 */
async function getSubmission(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const submission = await prisma.submissions.findUnique({
    where: { id: BigInt(req.params.id) },
    include: { submission_test_results: { orderBy: { test_case_id: 'asc' } } },
  });
  if (!submission || (submission.user_id !== BigInt(req.user.userId) && !isPrivileged(req))) {
    return res.status(404).json({ error: 'Submission not found' }); // 404, not 403 — don't reveal others' submissions
  }

  const { submission_test_results, ...s } = submission;
  res.json({
    submission: serialize(s),
    testResults: submission_test_results.map(serializeResult),
  });
}

module.exports = { createSubmission, listSubmissions, getSubmission };
