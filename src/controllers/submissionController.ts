import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import prisma from '../lib/prisma';
import type { Prisma } from '../generated/prisma';
import { isPrivileged } from '../lib/roles';
import { str, int, one } from '../lib/query';

// BigInt columns can't be JSON-serialized — stringify them.
function serialize<T extends { id: bigint; user_id: bigint; problem_id: bigint; language_id: bigint }>(s: T) {
  return {
    ...s,
    id: s.id.toString(),
    user_id: s.user_id.toString(),
    problem_id: s.problem_id.toString(),
    language_id: s.language_id.toString(),
  };
}
function serializeResult<T extends { id: bigint; submission_id: bigint; test_case_id: bigint }>(r: T) {
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
export async function createSubmission(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  // Parse from the original strings (not .toInt()) to keep BigInt precision.
  const problem_id = BigInt(req.body.problem_id);
  const language_id = BigInt(req.body.language_id);

  const problem = await prisma.problems.findUnique({ where: { id: problem_id } });
  if (!problem || (!problem.is_public && !isPrivileged(req))) {
    res.status(404).json({ error: 'Problem not found' }); // don't reveal hidden problems
    return;
  }
  const language = await prisma.languages.findUnique({ where: { id: language_id } });
  if (!language) {
    res.status(400).json({ error: 'Unknown language_id' });
    return;
  }

  const submission = await prisma.submissions.create({
    data: {
      user_id: BigInt(req.user!.userId),
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
export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const page = int(req.query.page, 1);
  const limit = Math.min(int(req.query.limit, 20), 100);

  const userIdFilter = str(req.query.user_id);
  const problemIdFilter = str(req.query.problem_id);
  const statusFilter = str(req.query.status);

  const where: Prisma.submissionsWhereInput = {};
  if (!isPrivileged(req)) {
    where.user_id = BigInt(req.user!.userId); // non-privileged: own submissions only
  } else if (userIdFilter) {
    where.user_id = BigInt(userIdFilter);
  }
  if (problemIdFilter) where.problem_id = BigInt(problemIdFilter);
  if (statusFilter) where.status = statusFilter;

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
export async function getSubmission(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const submission = await prisma.submissions.findUnique({
    where: { id: BigInt(one(req.params.id)) },
    include: { submission_test_results: { orderBy: { test_case_id: 'asc' } } },
  });
  if (!submission || (submission.user_id !== BigInt(req.user!.userId) && !isPrivileged(req))) {
    res.status(404).json({ error: 'Submission not found' }); // 404, not 403 — don't reveal others' submissions
    return;
  }

  const { submission_test_results, ...s } = submission;
  res.json({
    submission: serialize(s),
    testResults: submission_test_results.map(serializeResult),
  });
}
