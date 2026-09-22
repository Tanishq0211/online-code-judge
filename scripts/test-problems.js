// End-to-end check for the Phase 3 Problem API. Requires the server running:
//   Terminal 1:  npm run dev
//   Terminal 2:  node scripts/test-problems.js
require('dotenv').config();
const assert = require('assert');
const prisma = require('../src/lib/prisma');

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const uniq = Date.now().toString(36);
const admin = {
  username: `qaadmin${uniq}`,
  email: `qaadmin${uniq}@example.com`,
  password: 'Secret123!',
  role: 'admin',
};
const slug = `phase3-demo-${uniq}`;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

(async () => {
  // 0. server reachable
  const health = await api('GET', '/health');
  assert.strictEqual(health.status, 200, 'server not reachable — is it running?');

  // 1. register — role in the body MUST be ignored (privilege-escalation fix)
  const reg = await api('POST', '/api/auth/register', { body: admin });
  assert.strictEqual(reg.status, 201, `register failed: ${JSON.stringify(reg.data)}`);
  assert.strictEqual(reg.data.user.role, 'user', 'SECURITY: register must not honor a client-supplied role');

  // promote out-of-band (no self-service admin), then log in for a token carrying the new role
  await prisma.users.update({ where: { username: admin.username }, data: { role: 'admin' } });
  const login = await api('POST', '/api/auth/login', {
    body: { usernameOrEmail: admin.username, password: admin.password },
  });
  assert.strictEqual(login.status, 200, 'admin login failed');
  const token = login.data.accessToken;
  assert.ok(token, 'no admin token obtained');

  // 2. anonymous cannot create
  const anon = await api('POST', '/api/problems', {
    body: { slug, title: 'x', statement: 'y', difficulty: 'easy' },
  });
  assert.strictEqual(anon.status, 401, 'anon create should be 401');

  // 3. create as admin
  const created = await api('POST', '/api/problems', {
    token,
    body: {
      slug, title: 'Phase 3 Demo', statement: 'Add two numbers.',
      difficulty: 'easy', time_limit_ms: 2000, memory_limit_mb: 128,
    },
  });
  assert.strictEqual(created.status, 201, `create failed: ${JSON.stringify(created.data)}`);
  assert.strictEqual(typeof created.data.problem.id, 'string', 'id must be serialized as string');
  const id = created.data.problem.id;

  // 4. duplicate slug -> 409
  const dup = await api('POST', '/api/problems', {
    token, body: { slug, title: 'dup', statement: 'z', difficulty: 'easy' },
  });
  assert.strictEqual(dup.status, 409, 'duplicate slug should 409');

  // 5. invalid difficulty -> 400
  const bad = await api('POST', '/api/problems', {
    token, body: { slug: `${slug}-bad`, title: 't', statement: 's', difficulty: 'trivial' },
  });
  assert.strictEqual(bad.status, 400, 'invalid difficulty should 400');

  // 6. list is public and includes the new problem
  const list = await api('GET', '/api/problems');
  assert.strictEqual(list.status, 200);
  assert.ok(Array.isArray(list.data.data), 'list.data must be an array');
  assert.ok(list.data.pagination.total >= 1, 'total should be >= 1');

  // 7. difficulty filter doesn't leak other difficulties
  const filtered = await api('GET', '/api/problems?difficulty=easy&limit=5');
  assert.strictEqual(filtered.status, 200);
  assert.ok(filtered.data.data.every((p) => p.difficulty === 'easy'), 'difficulty filter leaked');

  // 8. get by slug (public)
  const got = await api('GET', `/api/problems/${slug}`);
  assert.strictEqual(got.status, 200);
  assert.strictEqual(got.data.problem.slug, slug);

  // 9. partial update
  const patched = await api('PATCH', `/api/problems/${id}`, {
    token, body: { title: 'Phase 3 Demo (edited)' },
  });
  assert.strictEqual(patched.status, 200);
  assert.strictEqual(patched.data.problem.title, 'Phase 3 Demo (edited)');

  // 10. soft delete
  const del = await api('DELETE', `/api/problems/${id}`, { token });
  assert.strictEqual(del.status, 200);
  assert.strictEqual(del.data.problem.is_public, false, 'soft delete should set is_public=false');

  // 11. anon can no longer see it
  const goneAnon = await api('GET', `/api/problems/${slug}`);
  assert.strictEqual(goneAnon.status, 404, 'soft-deleted problem should be 404 for anon');

  // 12. privileged user still sees it
  const goneAdmin = await api('GET', `/api/problems/${slug}`, { token });
  assert.strictEqual(goneAdmin.status, 200, 'privileged user should still see hidden problem');

  // 13. /api/me works with a valid token (BigInt id coercion fix)
  const me = await api('GET', '/api/me', { token });
  assert.strictEqual(me.status, 200, '/api/me should authenticate a valid token');
  assert.strictEqual(me.data.user.role, 'admin', '/api/me should report the DB role');

  // 14. refresh returns a usable access token…
  const refreshed = await api('POST', '/api/auth/refresh', { body: { refreshToken: login.data.refreshToken } });
  assert.strictEqual(refreshed.status, 200, 'refresh should succeed');

  // 15. …and that token carries the role fetched from the DB (not undefined)
  const me2 = await api('GET', '/api/me', { token: refreshed.data.accessToken });
  assert.strictEqual(me2.status, 200, 'refreshed token should authenticate');
  assert.strictEqual(me2.data.user.role, 'admin', 'refreshed token must carry role from DB');

  console.log('✅ Phase 3 + auth fixes: all checks passed');
})().catch((e) => {
  console.error('❌', e.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
