import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import prisma from '../lib/prisma';
import type { Prisma } from '../generated/prisma';
import { isPrivileged } from '../lib/roles';
import { str, int, one } from '../lib/query';

// Prisma returns BigInt for id/created_by — JSON can't serialize BigInt, so stringify.
function serialize<T extends { id: bigint; created_by: bigint | null }>(p: T) {
  return {
    ...p,
    id: p.id.toString(),
    created_by: p.created_by == null ? null : p.created_by.toString(),
  };
}

// Fields a client is allowed to set/change on a problem.
const WRITABLE_FIELDS = [
  'slug', 'title', 'statement', 'input_format', 'output_format',
  'constraints', 'difficulty', 'time_limit_ms', 'memory_limit_mb', 'is_public',
] as const;

/**
 * GET /api/problems
 * Query: page, limit, difficulty, search. Public; mod/admin also see non-public problems.
 */
export async function listProblems(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  // Express 5 makes req.query read-only, so express-validator's .toInt() can't
  // mutate it — parse here. Validators still reject non-integer input upstream.
  const page = int(req.query.page, 1);
  const limit = Math.min(int(req.query.limit, 20), 100);
  const difficulty = str(req.query.difficulty);
  const search = str(req.query.search);

  const where: Prisma.problemsWhereInput = {};
  if (!isPrivileged(req)) where.is_public = true; // anon/users: public only
  if (difficulty) where.difficulty = difficulty;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.problems.count({ where }),
    prisma.problems.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, title: true, difficulty: true,
        time_limit_ms: true, memory_limit_mb: true, is_public: true,
        created_by: true, created_at: true, updated_at: true,
      },
    }),
  ]);

  res.json({
    data: rows.map(serialize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * GET /api/problems/:slug
 * Full detail. Non-public problems are 404 for non-privileged callers (don't reveal existence).
 */
export async function getProblem(req: Request, res: Response): Promise<void> {
  const problem = await prisma.problems.findUnique({ where: { slug: one(req.params.slug) } });
  if (!problem || (!problem.is_public && !isPrivileged(req))) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }
  res.json({ problem: serialize(problem) });
}

/**
 * POST /api/problems  (moderator/admin)
 * Creates a problem; created_by is taken from the JWT, never the body.
 */
export async function createProblem(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const existing = await prisma.problems.findUnique({ where: { slug: req.body.slug } });
  if (existing) {
    res.status(409).json({ error: 'A problem with this slug already exists' });
    return;
  }

  // Whitelist loop, so the shape is only known at runtime — validated upstream by
  // the express-validator chains in routes/problems.ts.
  const data: Record<string, unknown> = { created_by: BigInt(req.user!.userId) };
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }

  const problem = await prisma.problems.create({ data: data as Prisma.problemsUncheckedCreateInput });
  res.status(201).json({ problem: serialize(problem) });
}

/**
 * PATCH /api/problems/:id  (moderator/admin)
 * Partial update. Only fields present in the body are changed.
 */
export async function updateProblem(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const id = BigInt(one(req.params.id));
  const existing = await prisma.problems.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }

  if (req.body.slug && req.body.slug !== existing.slug) {
    const clash = await prisma.problems.findUnique({ where: { slug: req.body.slug } });
    if (clash) {
      res.status(409).json({ error: 'A problem with this slug already exists' });
      return;
    }
  }

  const data: Record<string, unknown> = { updated_at: new Date() }; // no DB trigger bumps this, so set it here
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }

  const problem = await prisma.problems.update({ where: { id }, data: data as Prisma.problemsUncheckedUpdateInput });
  res.json({ problem: serialize(problem) });
}

/**
 * DELETE /api/problems/:id  (moderator/admin)
 * Soft delete: hides the problem from public listings.
 * ponytail: schema has no deleted_at column, so we reuse is_public — "hidden draft" and
 * "deleted" are indistinguishable. Add a status/deleted_at column + migration if you must tell them apart.
 */
export async function deleteProblem(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const id = BigInt(one(req.params.id));
  const existing = await prisma.problems.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }

  const problem = await prisma.problems.update({
    where: { id },
    data: { is_public: false, updated_at: new Date() },
  });
  res.json({ message: 'Problem hidden (soft-deleted)', problem: serialize(problem) });
}
