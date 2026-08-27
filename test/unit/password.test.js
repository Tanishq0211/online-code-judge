const { test } = require('node:test');
const assert = require('node:assert');
const { hash, compare } = require('../../src/utils/password');

test('hash then compare: right password matches, wrong does not', async () => {
  const h = await hash('correct horse battery');
  assert.ok(h && h !== 'correct horse battery'); // never stored in plaintext
  assert.strictEqual(await compare('correct horse battery', h), true);
  assert.strictEqual(await compare('wrong password', h), false);
});
