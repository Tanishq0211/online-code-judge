// Phase 7 ops smoke test. Spawns the API on a test port and asserts that
// health/readiness, /metrics, and rate limiting all work end to end.
//   node scripts/test-ops.js
// Requires DATABASE_URL reachable (the readiness check pings the DB).
const { spawn } = require('child_process');
const assert = require('assert');

const PORT = 3999;
const base = `http://localhost:${PORT}`;

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error('server did not become healthy in time');
}

async function checks() {
  // liveness
  const health = await fetch(`${base}/health`);
  assert.strictEqual(health.status, 200);
  assert.strictEqual((await health.json()).status, 'ok');
  console.log('✓ /health → 200 ok');

  // readiness (DB ping)
  const ready = await fetch(`${base}/health/ready`);
  assert.strictEqual(ready.status, 200, 'readiness should be 200 (is the DB up?)');
  assert.strictEqual((await ready.json()).db, 'ok');
  console.log('✓ /health/ready → 200 db ok');

  // metrics
  const metrics = await fetch(`${base}/metrics`);
  assert.strictEqual(metrics.status, 200);
  const body = await metrics.text();
  assert.ok(body.includes('http_request_duration_seconds'), 'missing http histogram');
  assert.ok(body.includes('process_cpu_seconds_total') || body.includes('nodejs_'), 'missing default metrics');
  console.log('✓ /metrics → 200 with expected series');

  // auth rate limit: 10 / 15min → the 11th+ rapid login is 429
  let sawHeader = false;
  let saw429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: 'x', password: 'y' }),
    });
    if (r.headers.get('ratelimit-remaining') !== null) sawHeader = true;
    if (r.status === 429) saw429 = true;
  }
  assert.ok(sawHeader, 'expected RateLimit-* headers');
  assert.ok(saw429, 'expected a 429 after exceeding the auth limit');
  console.log('✓ auth rate limit → 429 after 10 (RateLimit headers present)');

  console.log('\n✅ Phase 7 ops: all checks passed');
}

const server = spawn('node', ['dist/src/index.js'], { // built output (npm run build)
  env: { ...process.env, PORT: String(PORT), LOG_LEVEL: 'silent' },
  stdio: 'inherit',
});

(async () => {
  let code = 0;
  try {
    await waitForHealth();
    await checks();
  } catch (err) {
    console.error('❌', err.message);
    code = 1;
  } finally {
    server.kill();
    process.exit(code);
  }
})();
