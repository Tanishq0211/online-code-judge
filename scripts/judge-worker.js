// Long-running judge worker: polls for queued submissions and judges them one at a time.
//   node scripts/judge-worker.js   (or: npm run judge)
// Requires Docker + the language images pulled (docker pull python:3.12 gcc:13 eclipse-temurin:21).
require('dotenv').config({ quiet: true });
const prisma = require('../src/lib/prisma');
const { claimNext, judgeSubmission } = require('../src/services/judge');

const POLL_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let running = true;
process.on('SIGINT', () => { running = false; }); // finish the current job, then exit

// ponytail: one submission at a time. claimNext is already atomic, so scaling out is
// "run more copies of this script" — add an in-process pool only if one worker can't keep up.
(async () => {
  console.log(`judge worker started; polling every ${POLL_MS}ms`);
  while (running) {
    let id = null;
    try { id = await claimNext(); } catch (e) { console.error('claim error:', e.message); }
    if (!id) { await sleep(POLL_MS); continue; }

    console.log('judging submission', id.toString());
    try {
      await judgeSubmission(id);
      console.log('done', id.toString());
    } catch (e) {
      console.error('judge error for', id.toString(), '-', e.message);
      // never leave a claimed row stuck in 'judging'
      await prisma.submissions.update({
        where: { id }, data: { status: 'internal_error', completed_at: new Date() },
      }).catch(() => {});
    }
  }
  await prisma.$disconnect();
  console.log('judge worker stopped');
})();
