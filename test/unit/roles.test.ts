import { test } from 'node:test';
import assert from 'node:assert';
import { isPrivileged } from '../../src/lib/roles';

test('isPrivileged: only moderator and admin', () => {
  assert.strictEqual(isPrivileged({ user: { role: 'admin' } }), true);
  assert.strictEqual(isPrivileged({ user: { role: 'moderator' } }), true);
  assert.strictEqual(isPrivileged({ user: { role: 'user' } }), false);
  assert.strictEqual(isPrivileged({}), false); // unauthenticated
});
