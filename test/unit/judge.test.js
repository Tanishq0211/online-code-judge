require('dotenv').config(); // judge.js pulls in prisma; load env so client construction is happy
const { test } = require('node:test');
const assert = require('node:assert');
const { normalize, verdictFromRun } = require('../../src/services/judge');

test('normalize: strips CRLF, trailing whitespace, and trailing newlines', () => {
  assert.strictEqual(normalize('a  \r\nb\t\n\n\n'), 'a\nb');
  assert.strictEqual(normalize('5\n'), '5');
  assert.strictEqual(normalize('   '), '');
  assert.strictEqual(normalize('x\ny'), 'x\ny'); // interior newline preserved
});

test('verdictFromRun: exit code drives the verdict', () => {
  assert.strictEqual(verdictFromRun({ code: 124, stdout: '' }, ''), 'time_limit_exceeded');
  assert.strictEqual(verdictFromRun({ code: 137, stdout: '' }, ''), 'memory_limit_exceeded');
  assert.strictEqual(verdictFromRun({ code: 1, stdout: '' }, ''), 'runtime_error');
});

test('verdictFromRun: exit 0 compares output (whitespace-insensitive)', () => {
  assert.strictEqual(verdictFromRun({ code: 0, stdout: '5\n' }, '5'), 'accepted');
  assert.strictEqual(verdictFromRun({ code: 0, stdout: '5 \r\n' }, '5'), 'accepted');
  assert.strictEqual(verdictFromRun({ code: 0, stdout: '6' }, '5'), 'wrong_answer');
});
