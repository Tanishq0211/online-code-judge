// Exercises the real authLimiter middleware on a throwaway app, so hammering it
// can't eat into the shared auth limit used by api.test.ts.
import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { authLimiter } from '../../src/middleware/rateLimit';

test('authLimiter → 429 after the limit, with RateLimit-* headers', async () => {
  const app = express();
  app.post('/login', authLimiter, (req, res) => res.json({ ok: true }));

  let saw429 = false;
  let sawHeader = false;
  for (let i = 0; i < 12; i++) {
    const res = await request(app).post('/login'); // authLimiter is 10 / 15m
    if (res.headers['ratelimit-remaining'] !== undefined) sawHeader = true;
    if (res.status === 429) saw429 = true;
  }
  assert.ok(sawHeader, 'expected RateLimit-* headers');
  assert.ok(saw429, 'expected a 429 after exceeding the limit');
});
