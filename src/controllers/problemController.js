const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');

// Roles that may see non-public problems and mutate problems.
const PRIVILEGED_ROLES = ['moderator', 'admin'];
const isPrivileged = (req) => !!req.user && PRIVILEGED_ROLES.includes(req.user.role);

// Prisma returns BigInt for id/created_by — JSON can't serialize BigInt, so stringify.
function serialize(p) {
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
];

/**
 * GET /api/problems
 * Query: page, limit, difficulty, search. Public; mod/admin also see non-public problems.
 */
async function listProblems(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Express 5 makes req.query read-only, so express-validator's .toInt() can't
  // mutate it — parse here. Validators still reject non-integer input upstream.
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const { difficulty, search } = req.query;

  const where = {};
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
async function getProblem(req, res) {
  const problem = await prisma.problems.findUnique({ where: { slug: req.params.slug } });
  if (!problem || (!problem.is_public && !isPrivileged(req))) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json({ problem: serialize(problem) });
}

/**
 * POST /api/problems  (moderator/admin)
 * Creates a problem; created_by is taken from the JWT, never the body.
 */
async function createProblem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const existing = await prisma.problems.findUnique({ where: { slug: req.body.slug } });
  if (existing) return res.status(409).json({ error: 'A problem with this slug already exists' });

  const data = { created_by: BigInt(req.user.userId) };
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }

  const problem = await prisma.problems.create({ data });
  res.status(201).json({ problem: serialize(problem) });
}

/**
 * PATCH /api/problems/:id  (moderator/admin)
 * Partial update. Only fields present in the body are changed.
 */
async function updateProblem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const id = BigInt(req.params.id);
  const existing = await prisma.problems.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Problem not found' });

  if (req.body.slug && req.body.slug !== existing.slug) {
    const clash = await prisma.problems.findUnique({ where: { slug: req.body.slug } });
    if (clash) return res.status(409).json({ error: 'A problem with this slug already exists' });
  }

  const data = { updated_at: new Date() }; // no DB trigger bumps this, so set it here
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }

  const problem = await prisma.problems.update({ where: { id }, data });
  res.json({ problem: serialize(problem) });
}

/**
 * DELETE /api/problems/:id  (moderator/admin)
 * Soft delete: hides the problem from public listings.
 * ponytail: schema has no deleted_at column, so we reuse is_public — "hidden draft" and
 * "deleted" are indistinguishable. Add a status/deleted_at column + migration if you must tell them apart.
 */
async function deleteProblem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const id = BigInt(req.params.id);
  const existing = await prisma.problems.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Problem not found' });

  const problem = await prisma.problems.update({
    where: { id },
    data: { is_public: false, updated_at: new Date() },
  });
  res.json({ message: 'Problem hidden (soft-deleted)', problem: serialize(problem) });
}

module.exports = { listProblems, getProblem, createProblem, updateProblem, deleteProblem };
