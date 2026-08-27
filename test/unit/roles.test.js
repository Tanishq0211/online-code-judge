const { test } = require('node:test');
const assert = require('node:assert');
const { isPrivileged } = require('../../src/lib/roles');

test('isPrivileged: only moderator and admin', () => {
  assert.strictEqual(isPrivileged({ user: { role: 'admin' } }), true);
  assert.strictEqual(isPrivileged({ user: { role: 'moderator' } }), true);
  assert.strictEqual(isPrivileged({ user: { role: 'user' } }), false);
  assert.strictEqual(isPrivileged({}), false); // unauthenticated
});
