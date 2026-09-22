// End-to-end check for the Phase 5 Submission API. Requires the server running:
//   Terminal 1:  npm run dev
//   Terminal 2:  node scripts/test-submissions.js
require('dotenv').config({ quiet: true });
const assert = require('assert');
const prisma = require('../src/lib/prisma');

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const uniq = Date.now().toString(36);
const adminU = { username: `subadm${uniq}`, email: `subadm${uniq}@example.com`, password: 'Secret123!' };
const userU = { username: `subusr${uniq}`, email: `subusr${uniq}@example.com`, password: 'Secret123!' };
const user2U = { username: `subusrb${uniq}`, email: `subusrb${uniq}@example.com`, password: 'Secret123!' };
const slug = `phase5-demo-${uniq}`;
const privSlug = `phase5-priv-${uniq}`;
const PYTHON = 2; // seeded languages: 1=C++, 2=Python, 3=Java

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}
async function registerLogin(u, { admin = false } = {}) {
  const reg = await api('POST', '/api/auth/register', { body: u });
  assert.strictEqual(reg.status, 201, `register failed: ${JSON.stringify(reg.data)}`);
  if (admin) await prisma.users.update({ where: { username: u.username }, data: { role: 'admin' } });
  const login = await api('POST', '/api/auth/login', { body: { usernameOrEmail: u.username, password: u.password } });
  assert.ok(login.data.accessToken, 'no token');
  return login.data.accessToken;
}

(async () => {
  assert.strictEqual((await api('GET', '/health')).status, 200, 'server not reachable');

  const adminTok = await registerLogin(adminU, { admin: true });
  const userTok = await registerLogin(userU);
  const user2Tok = await registerLogin(user2U);

  // admin sets up a public and a private problem
  const pub = await api('POST', '/api/problems', {
    token: adminTok, body: { slug, title: 'P5 Public', statement: 'echo', difficulty: 'easy' },
  });
  assert.strictEqual(pub.status, 201, `problem create failed: ${JSON.stringify(pub.data)}`);
  const problemId = pub.data.problem.id;
  const priv = await api('POST', '/api/problems', {
    token: adminTok, body: { slug: privSlug, title: 'P5 Private', statement: 'secret', difficulty: 'hard', is_public: false },
  });
  const privId = priv.data.problem.id;

  // 1. anon cannot submit
  const anon = await api('POST', '/api/submissions', { body: { problem_id: problemId, language_id: PYTHON, source_code: 'print(1)' } });
  assert.strictEqual(anon.status, 401, 'anon submit should 401');

  // 2. user submits -> 201, status queued, ids are strings
  const sub = await api('POST', '/api/submissions', {
    token: userTok, body: { problem_id: problemId, language_id: PYTHON, source_code: 'print(input())' },
  });
  assert.strictEqual(sub.status, 201, `submit failed: ${JSON.stringify(sub.data)}`);
  assert.strictEqual(sub.data.submission.status, 'queued', 'new submission should be queued');
  assert.strictEqual(typeof sub.data.submission.id, 'string', 'id must serialize to string');
  const subId = sub.data.submission.id;

  // 3. unknown language -> 400
  const badLang = await api('POST', '/api/submissions', {
    token: userTok, body: { problem_id: problemId, language_id: 9999, source_code: 'x' },
  });
  assert.strictEqual(badLang.status, 400, 'unknown language should 400');

  // 4. submit to a hidden problem -> 404 (existence not revealed)
  const toHidden = await api('POST', '/api/submissions', {
    token: userTok, body: { problem_id: privId, language_id: PYTHON, source_code: 'x' },
  });
  assert.strictEqual(toHidden.status, 404, 'submit to hidden problem should 404');

  // 5. empty source -> 400
  const empty = await api('POST', '/api/submissions', {
    token: userTok, body: { problem_id: problemId, language_id: PYTHON, source_code: '' },
  });
  assert.strictEqual(empty.status, 400, 'empty source should 400');

  // 6. user lists own submissions; source_code is NOT in the list payload
  const mine = await api('GET', '/api/submissions', { token: userTok });
  assert.strictEqual(mine.status, 200);
  assert.ok(mine.data.data.some((s) => s.id === subId), 'own submission should appear');
  assert.ok(mine.data.data.every((s) => s.source_code === undefined), 'list must not include source_code');

  // 7. owner reads detail incl. testResults array (empty until the judge runs)
  const detail = await api('GET', `/api/submissions/${subId}`, { token: userTok });
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.data.submission.id, subId);
  assert.ok(Array.isArray(detail.data.testResults), 'testResults should be an array');
  assert.strictEqual(detail.data.testResults.length, 0, 'no results before judging');

  // 8. a different user cannot read it -> 404
  const other = await api('GET', `/api/submissions/${subId}`, { token: user2Tok });
  assert.strictEqual(other.status, 404, 'non-owner should 404');

  // 9. admin can read any submission
  const adminDetail = await api('GET', `/api/submissions/${subId}`, { token: adminTok });
  assert.strictEqual(adminDetail.status, 200, 'admin should read any submission');

  // 10. admin can filter everyone's submissions by user_id
  const userRow = await prisma.users.findUnique({ where: { username: userU.username }, select: { id: true } });
  const adminList = await api('GET', `/api/submissions?user_id=${userRow.id}`, { token: adminTok });
  assert.strictEqual(adminList.status, 200);
  assert.ok(adminList.data.data.some((s) => s.id === subId), 'admin filter should find the submission');

  // 11. non-privileged user_id filter is ignored (still only own) — user2 sees none of user1's
  const leak = await api('GET', `/api/submissions?user_id=${userRow.id}`, { token: user2Tok });
  assert.strictEqual(leak.status, 200);
  assert.ok(!leak.data.data.some((s) => s.id === subId), 'user_id filter must not let a user read others');

  console.log('✅ Phase 5 Submission API: all checks passed');
})().catch((e) => {
  console.error('❌', e.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
