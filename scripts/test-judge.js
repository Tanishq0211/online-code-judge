// End-to-end check for the Phase 5b Docker judge. Needs Docker + the language images:
//   docker pull python:3.12 && docker pull gcc:13 && docker pull eclipse-temurin:21
//   node scripts/test-judge.js
// Runs real containers, so it's slow (~30-60s). No HTTP server required — it drives the
// judge core directly and asserts the persisted verdicts.
require('dotenv').config({ quiet: true });
const assert = require('assert');
const prisma = require('../src/lib/prisma');
const { judgeSubmission } = require('../src/services/judge');

const uniq = Date.now().toString(36);

async function judge(userId, problemId, languageId, source) {
  const s = await prisma.submissions.create({
    data: { user_id: userId, problem_id: problemId, language_id: languageId, source_code: source, status: 'queued' },
  });
  await judgeSubmission(s.id);
  return prisma.submissions.findUnique({ where: { id: s.id }, include: { submission_test_results: true } });
}

(async () => {
  const langs = await prisma.languages.findMany();
  const byName = Object.fromEntries(langs.map((l) => [l.name, l.id]));
  const PYTHON = byName.Python;
  const CPP = byName['C++'];
  const JAVA = byName.Java;
  assert.ok(PYTHON && CPP && JAVA, 'Python, C++ and Java languages must be seeded');

  const user = await prisma.users.create({
    data: { username: `judge${uniq}`, email: `judge${uniq}@ex.com`, password_hash: 'x', role: 'user' },
  });
  const problem = await prisma.problems.create({
    data: {
      slug: `judge-ab-${uniq}`, title: 'A+B', statement: 'read two ints, print their sum',
      difficulty: 'easy', time_limit_ms: 2000, memory_limit_mb: 256, created_by: user.id, is_public: true,
    },
  });
  await prisma.test_cases.createMany({
    data: [
      { problem_id: problem.id, input: '2 3\n', expected_output: '5', is_visible: true, order_index: 1 },
      { problem_id: problem.id, input: '10 20\n', expected_output: '30', is_visible: false, order_index: 2 },
    ],
  });

  try {
    // --- Python (interpreted, no compile step) ---
    const okPy = await judge(user.id, problem.id, PYTHON, 'a,b=map(int,input().split());print(a+b)');
    assert.strictEqual(okPy.status, 'accepted', `py accepted, got ${okPy.status}`);
    assert.strictEqual(okPy.submission_test_results.length, 2, 'two per-test rows written');
    assert.ok(okPy.submission_test_results.every((r) => r.status === 'accepted'), 'all tests accepted');
    assert.ok(okPy.completed_at, 'completed_at set');
    assert.ok(okPy.runtime_ms >= 0, 'runtime_ms recorded');

    const waPy = await judge(user.id, problem.id, PYTHON, 'print(0)');
    assert.strictEqual(waPy.status, 'wrong_answer', `py WA, got ${waPy.status}`);

    const rePy = await judge(user.id, problem.id, PYTHON, 'raise SystemExit(1)');
    assert.strictEqual(rePy.status, 'runtime_error', `py RE, got ${rePy.status}`);

    const tlePy = await judge(user.id, problem.id, PYTHON, 'while True: pass');
    assert.strictEqual(tlePy.status, 'time_limit_exceeded', `py TLE, got ${tlePy.status}`);

    // --- C++ (compiled) ---
    const okCpp = await judge(user.id, problem.id, CPP,
      '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;return 0;}');
    assert.strictEqual(okCpp.status, 'accepted', `cpp accepted, got ${okCpp.status}`);

    const ceCpp = await judge(user.id, problem.id, CPP, 'int main(){ this is not valid c++ }');
    assert.strictEqual(ceCpp.status, 'compilation_error', `cpp CE, got ${ceCpp.status}`);
    assert.ok(ceCpp.compiler_output && ceCpp.compiler_output.length > 0, 'compiler_output captured');
    assert.ok(ceCpp.submission_test_results.every((r) => r.status === 'skipped'), 'tests skipped on CE');

    // --- Java (compiled; user code must declare `public class Main`) ---
    const okJava = await judge(user.id, problem.id, JAVA,
      'import java.util.Scanner;\npublic class Main{public static void main(String[] a){Scanner s=new Scanner(System.in);System.out.print(s.nextInt()+s.nextInt());}}');
    assert.strictEqual(okJava.status, 'accepted', `java accepted, got ${okJava.status}`);

    const ceJava = await judge(user.id, problem.id, JAVA, 'public class Main { not valid java }');
    assert.strictEqual(ceJava.status, 'compilation_error', `java CE, got ${ceJava.status}`);
    assert.ok(ceJava.compiler_output && ceJava.compiler_output.length > 0, 'java compiler_output captured');

    console.log('✅ Phase 5b judge: all checks passed');
  } finally {
    // FK cascade cleans submissions / results / test cases
    await prisma.problems.delete({ where: { id: problem.id } }).catch(() => {});
    await prisma.users.delete({ where: { id: user.id } }).catch(() => {});
  }
})().catch((e) => {
  console.error('❌', e.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
