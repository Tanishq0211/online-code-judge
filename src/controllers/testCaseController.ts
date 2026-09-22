import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import prisma from '../lib/prisma';
import type { Prisma } from '../generated/prisma';
import { isPrivileged } from '../lib/roles';
import { one } from '../lib/query';

// Prisma returns BigInt for id/problem_id — JSON can't serialize BigInt.
function serialize<T extends { id: bigint; problem_id: bigint }>(tc: T) {
  return { ...tc, id: tc.id.toString(), problem_id: tc.problem_id.toString() };
}

// All handlers below assume loadProblem middleware set req.problem (hence req.problem!).

/**
 * GET /api/problems/:slug/test-cases
 * Public: only visible (sample) cases. mod/admin: all cases.
 */
export async function listTestCases(req: Request, res: Response): Promise<void> {
  const where: Prisma.test_casesWhereInput = { problem_id: req.problem!.id };
  if (!isPrivileged(req)) where.is_visible = true; // hidden judging cases never leak
  const rows = await prisma.test_cases.findMany({
    where,
    orderBy: { order_index: 'asc' },
  });
  res.json({ data: rows.map(serialize) });
}

/**
 * POST /api/problems/:slug/test-cases  (moderator/admin)
 * order_index: uses the provided value, else auto-assigns max+1 (DB CHECK requires > 0).
 */
export async function createTestCase(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const problem_id = req.problem!.id;
  let { order_index } = req.body;
  if (order_index === undefined) {
    const agg = await prisma.test_cases.aggregate({
      where: { problem_id }, _max: { order_index: true },
    });
    order_index = (agg._max.order_index || 0) + 1;
  } else {
    const clash = await prisma.test_cases.findUnique({
      where: { problem_id_order_index: { problem_id, order_index } },
    });
    if (clash) {
      res.status(409).json({ error: `order_index ${order_index} already used for this problem` });
      return;
    }
  }

  const tc = await prisma.test_cases.create({
    data: {
      problem_id,
      input: req.body.input,
      expected_output: req.body.expected_output,
      is_visible: req.body.is_visible ?? false,
      order_index,
    },
  });
  res.status(201).json({ testCase: serialize(tc) });
}

/**
 * PATCH /api/problems/:slug/test-cases/:id  (moderator/admin)
 * Partial update, scoped to the parent problem so ids can't cross problems.
 */
export async function updateTestCase(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const id = BigInt(one(req.params.id));
  const existing = await prisma.test_cases.findFirst({
    where: { id, problem_id: req.problem!.id },
  });
  if (!existing) {
    res.status(404).json({ error: 'Test case not found' });
    return;
  }

  if (req.body.order_index !== undefined && req.body.order_index !== existing.order_index) {
    const clash = await prisma.test_cases.findUnique({
      where: { problem_id_order_index: { problem_id: req.problem!.id, order_index: req.body.order_index } },
    });
    if (clash) {
      res.status(409).json({ error: `order_index ${req.body.order_index} already used for this problem` });
      return;
    }
  }

  const data: Record<string, unknown> = {};
  for (const f of ['input', 'expected_output', 'is_visible', 'order_index'] as const) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }
  const tc = await prisma.test_cases.update({ where: { id }, data: data as Prisma.test_casesUncheckedUpdateInput });
  res.json({ testCase: serialize(tc) });
}

/**
 * DELETE /api/problems/:slug/test-cases/:id  (moderator/admin)
 * Hard delete. ponytail: no soft-delete column here; the FK cascades to
 * submission_test_results, so deleting a case drops its historical judge results.
 * Fine pre-submissions (Phase 5); add a deleted_at flag if that history must survive.
 */
export async function deleteTestCase(req: Request, res: Response): Promise<void> {
  const id = BigInt(one(req.params.id));
  const existing = await prisma.test_cases.findFirst({
    where: { id, problem_id: req.problem!.id },
  });
  if (!existing) {
    res.status(404).json({ error: 'Test case not found' });
    return;
  }

  await prisma.test_cases.delete({ where: { id } });
  res.json({ message: 'Test case deleted' });
}
