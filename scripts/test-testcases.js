// End-to-end check for the Phase 4 Test-Case API. Requires the server running:
//   Terminal 1:  npm run dev
//   Terminal 2:  node scripts/test-testcases.js
require('dotenv').config({ quiet: true });
const assert = require('assert');
const prisma = require('../src/lib/prisma');

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const uniq = Date.now().toString(36);
const admin = {
  username: `tcadmin${uniq}`,
  email: `tcadmin${uniq}@example.com`,
  password: 'Secret123!',
};
const slug = `phase4-demo-${uniq}`;

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

const TC = `/api/problems/${slug}/test-cases`;

(async () => {
  // 0. server reachable
  assert.strictEqual((await api('GET', '/health')).status, 200, 'server not reachable — is it running?');

  // provision an admin (register ignores role -> promote out-of-band -> login)
  const reg = await api('POST', '/api/auth/register', { body: admin });
  assert.strictEqual(reg.status, 201, `register failed: ${JSON.stringify(reg.data)}`);
  await prisma.users.update({ where: { username: admin.username }, data: { role: 'admin' } });
  const login = await api('POST', '/api/auth/login', {
    body: { usernameOrEmail: admin.username, password: admin.password },
  });
  const token = login.data.accessToken;
  assert.ok(token, 'no admin token');

  // a problem to attach test cases to
  const prob = await api('POST', '/api/problems', {
    token, body: { slug, title: 'Phase 4 Demo', statement: 'Echo the input.', difficulty: 'easy' },
  });
  assert.strictEqual(prob.status, 201, `problem create failed: ${JSON.stringify(prob.data)}`);

  // 1. anonymous cannot create a test case
  const anonCreate = await api('POST', TC, { body: { input: '1', expected_output: '1' } });
  assert.strictEqual(anonCreate.status, 401, 'anon create should be 401');

  // 2. create a VISIBLE (sample) case — order auto-assigned to 1
  const vis = await api('POST', TC, {
    token, body: { input: '2 3', expected_output: '5', is_visible: true },
  });
  assert.strictEqual(vis.status, 201, `visible create failed: ${JSON.stringify(vis.data)}`);
  assert.strictEqual(vis.data.testCase.is_visible, true);
  assert.strictEqual(vis.data.testCase.order_index, 1, 'first auto order_index should be 1');
  assert.strictEqual(typeof vis.data.testCase.id, 'string', 'id must serialize to string');
  const visId = vis.data.testCase.id;

  // 3. create a HIDDEN (judging) case — order auto-increments to 2
  const hid = await api('POST', TC, {
    token, body: { input: '10 20', expected_output: '30' }, // is_visible defaults false
  });
  assert.strictEqual(hid.status, 201, `hidden create failed: ${JSON.stringify(hid.data)}`);
  assert.strictEqual(hid.data.testCase.is_visible, false);
  assert.strictEqual(hid.data.testCase.order_index, 2, 'auto order_index should increment');
  const hidId = hid.data.testCase.id;

  // 4. duplicate explicit order_index -> 409
  const dup = await api('POST', TC, {
    token, body: { input: 'x', expected_output: 'y', order_index: 1 },
  });
  assert.strictEqual(dup.status, 409, 'duplicate order_index should 409');

  // 5. order_index = 0 rejected by validator (DB CHECK is > 0) -> 400
  const zero = await api('POST', TC, {
    token, body: { input: 'x', expected_output: 'y', order_index: 0 },
  });
  assert.strictEqual(zero.status, 400, 'order_index 0 should 400');

  // 6. admin list sees BOTH, hidden case includes its expected_output
  const adminList = await api('GET', TC, { token });
  assert.strictEqual(adminList.status, 200);
  assert.strictEqual(adminList.data.data.length, 2, 'admin should see visible + hidden');
  const hiddenRow = adminList.data.data.find((t) => t.id === hidId);
  assert.strictEqual(hiddenRow.expected_output, '30', 'admin should see hidden expected_output');

  // 7. anonymous list sees ONLY the visible case; hidden never leaks
  const anonList = await api('GET', TC);
  assert.strictEqual(anonList.status, 200);
  assert.strictEqual(anonList.data.data.length, 1, 'anon should see only visible cases');
  assert.strictEqual(anonList.data.data[0].id, visId, 'anon should see the visible case');
  assert.ok(!anonList.data.data.some((t) => t.id === hidId), 'hidden case must NOT leak to anon');

  // 8. partial update the hidden case
  const patched = await api('PATCH', `${TC}/${hidId}`, { token, body: { expected_output: '31' } });
  assert.strictEqual(patched.status, 200);
  assert.strictEqual(patched.data.testCase.expected_output, '31');

  // 9. update to a clashing order_index -> 409
  const patchClash = await api('PATCH', `${TC}/${hidId}`, { token, body: { order_index: 1 } });
  assert.strictEqual(patchClash.status, 409, 'order_index clash on update should 409');

  // 10. delete the visible case, then it's gone from the admin list
  const del = await api('DELETE', `${TC}/${visId}`, { token });
  assert.strictEqual(del.status, 200);
  const afterDel = await api('GET', TC, { token });
  assert.strictEqual(afterDel.data.data.length, 1, 'one case should remain after delete');
  assert.strictEqual(afterDel.data.data[0].id, hidId, 'the hidden case should remain');

  // 11. hide the parent problem -> anon gets 404 on its test-case list (existence hidden)
  const probId = prob.data.problem.id;
  await api('PATCH', `/api/problems/${probId}`, { token, body: { is_public: false } });
  const anonHidden = await api('GET', TC);
  assert.strictEqual(anonHidden.status, 404, 'anon should 404 on a hidden problem');
  const adminHidden = await api('GET', TC, { token });
  assert.strictEqual(adminHidden.status, 200, 'admin should still access a hidden problem');

  // 12. deleting the problem cascades away its test cases
  await prisma.problems.delete({ where: { id: BigInt(probId) } });
  const orphans = await prisma.test_cases.count({ where: { problem_id: BigInt(probId) } });
  assert.strictEqual(orphans, 0, 'FK cascade should remove test cases with the problem');

  console.log('✅ Phase 4 Test-Case API: all checks passed');
})().catch((e) => {
  console.error('❌', e.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
