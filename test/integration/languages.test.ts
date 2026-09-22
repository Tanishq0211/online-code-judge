import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/index';

test('GET /api/languages → 200, string ids, no auth required', async () => {
  const res = await request(app).get('/api/languages');
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 1);
  const l = res.body.data[0];
  assert.strictEqual(typeof l.id, 'string');   // BigInt must be stringified
  assert.strictEqual(typeof l.name, 'string');
});
