require('dotenv').config(); // DATABASE_URL + JWT secrets (no-op in CI where they're real env)
const { test, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../../src/index');
const prisma = require('../../src/lib/prisma');

const uname = `itest${Date.now()}`; // unique so reruns don't collide
const email = `${uname}@example.com`;
const password = 'secret123';

after(async () => {
  await prisma.users.deleteMany({ where: { username: uname } }).catch(() => {});
  await prisma.$disconnect().catch(() => {});
});

test('GET /health → 200 ok', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('GET /health/ready → 200 db ok', async () => {
  const res = await request(app).get('/health/ready');
  assert.strictEqual(res.status, 200, 'readiness failed — is the DB up?');
  assert.strictEqual(res.body.db, 'ok');
});

test('GET /metrics → 200 with prometheus series', async () => {
  const res = await request(app).get('/metrics');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /http_request_duration_seconds/);
});

test('unknown route → 404', async () => {
  const res = await request(app).get('/definitely-not-a-route');
  assert.strictEqual(res.status, 404);
});

test('register → login → /api/me round-trip', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: uname, email, password });
  assert.strictEqual(reg.status, 201, JSON.stringify(reg.body));
  assert.ok(reg.body.accessToken);
  assert.strictEqual(reg.body.user.role, 'user'); // client cannot self-assign a role

  const login = await request(app).post('/api/auth/login').send({ usernameOrEmail: uname, password });
  assert.strictEqual(login.status, 200);
  const token = login.body.accessToken;
  assert.ok(token);

  const me = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.username, uname);
});
