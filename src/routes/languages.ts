import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import prisma from '../lib/prisma';

const router = express.Router();

// GET /api/languages — public list for the frontend language picker.
// ids are seed data (1=C++, 2=Python, 3=Java); stringify BigInt for JSON.
router.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.languages.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });
  res.json({ data: rows.map((l) => ({ id: l.id.toString(), name: l.name })) });
}));

export default router;
