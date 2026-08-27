// Secrets must be set BEFORE requiring jwt.js — it reads process.env at load time.
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken,
} = require('../../src/utils/jwt');

test('access token round-trips and coerces BigInt userId to string', () => {
  const token = signAccessToken({ userId: 42n, role: 'user', email: 'a@b.co' });
  const decoded = verifyAccessToken(token);
  assert.strictEqual(decoded.userId, '42'); // BigInt -> string, survives JSON
  assert.strictEqual(decoded.role, 'user');
});

test('refresh token round-trips', () => {
  const token = signRefreshToken({ userId: 7n });
  assert.strictEqual(verifyRefreshToken(token).userId, '7');
});

test('verify rejects a malformed token', () => {
  assert.throws(() => verifyAccessToken('not.a.jwt'));
});

test('access secret does not validate a refresh token', () => {
  const refresh = signRefreshToken({ userId: 1n });
  assert.throws(() => verifyAccessToken(refresh)); // signed with the other secret
});
