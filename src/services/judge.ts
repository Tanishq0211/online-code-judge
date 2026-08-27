// Docker-sandboxed judge core. Claims a submission, runs its source against the
// problem's test cases in a locked-down container, and writes the verdicts.
//
// Sandbox: one container per submission (`docker run -d`), locked down with --network none,
// memory+swap capped at the problem's limit, --pids-limit fork-bomb guard, --cpus 1, run as
// nobody (--user 65534) on a --read-only rootfs with writable tmpfs only on /work and /tmp,
// all Linux capabilities dropped, and no-new-privileges. Per-test time limit is enforced
// INSIDE the container with coreutils `timeout` (exit 124 = TLE); a kernel OOM-kill surfaces
// as exit 137 = MLE. User source is piped in over stdin and never interpolated into a shell —
// only trusted DB commands + a numeric timeout are.
//
// ponytail: Ceilings left in place — runtime_ms is host wall-clock (includes exec overhead);
// memory_kb is NULL (accurate per-test memory needs per-test containers or /usr/bin/time,
// which the images lack); 137→MLE is a heuristic (any SIGKILL reads as MLE). For untrusted
// public load the next steps are a stricter seccomp profile and a gVisor/Kata runtime.

import { execFile, type ExecFileException } from 'child_process';
import prisma from '../lib/prisma';
import type { submissions } from '../generated/prisma';

// The DB compile/run commands assume these filenames, run from cwd /work.
const SOURCE_FILE: Record<string, string> = { 'C++': 'main.cpp', Python: 'main.py', Java: 'Main.java' };
const COMPILE_TIMEOUT_S = 20;
const CONTAINER_TTL_S = 600; // sleeper lifetime; we rm -f in finally regardless
const OUTPUT_CAP = 10_000;   // chars stored per stdout / stderr / compiler_output

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** One row destined for submission_test_results. */
interface TestResultRow {
  test_case_id: bigint;
  status: string;
  runtime_ms?: number | null;
  memory_kb?: number | null;
  stdout?: string;
  stderr?: string;
}

function run(
  args: string[],
  { input, timeoutMs = 60_000 }: { input?: string; timeoutMs?: number } = {}
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = execFile('docker', args, { maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs },
      (err: ExecFileException | null, stdout, stderr) => {
        let code = 0;
        if (err) {
          if (err.killed) code = 124;                 // host backstop fired -> treat as TLE
          else if (typeof err.code === 'number') code = err.code;
          else code = 1;                              // spawn error (e.g. docker not found)
        }
        resolve({ code, stdout: stdout || '', stderr: stderr || '' });
      });
    if (input !== undefined) child.stdin?.end(input);
    child.stdin?.on('error', () => {});               // ignore EPIPE if the program exits early
  });
}

// trailing-whitespace-insensitive line compare (the common judge default)
export function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}

export function verdictFromRun(r: Pick<RunResult, 'code' | 'stdout'>, expected: string): string {
  if (r.code === 124) return 'time_limit_exceeded';
  if (r.code === 137) return 'memory_limit_exceeded';
  if (r.code !== 0) return 'runtime_error';
  return normalize(r.stdout) === normalize(expected) ? 'accepted' : 'wrong_answer';
}

export async function judgeSubmission(submissionId: bigint | string | number): Promise<void> {
  const id = BigInt(submissionId);
  const submission = await prisma.submissions.findUnique({ where: { id } });
  if (!submission) return;

  const [problem, language, testCases] = await Promise.all([
    prisma.problems.findUnique({ where: { id: submission.problem_id } }),
    prisma.languages.findUnique({ where: { id: submission.language_id } }),
    prisma.test_cases.findMany({ where: { problem_id: submission.problem_id }, orderBy: { order_index: 'asc' } }),
  ]);
  // FKs make these unreachable in practice; a clear throw beats a TypeError if they ever aren't.
  if (!problem || !language) throw new Error(`submission ${id} references a missing problem or language`);

  const srcName = SOURCE_FILE[language.name];
  if (!srcName) throw new Error(`no source-filename mapping for language "${language.name}"`);

  const mem = `${problem.memory_limit_mb}m`;
  const started = await run(['run', '-d',
    '--network', 'none',                    // no network access
    '--memory', mem, '--memory-swap', mem,  // hard memory cap, no swap
    '--pids-limit', '128',                  // fork-bomb guard
    '--cpus', '1',
    '--user', '65534:65534',                // run as nobody, never root
    '--read-only',                          // immutable rootfs
    '--tmpfs', '/work:exec,mode=1777',      // writable scratch: source + build output + exec
    '--tmpfs', '/tmp:mode=1777',            // g++/javac intermediates, JVM perfdata
    '--cap-drop', 'ALL',                    // drop every Linux capability
    '--security-opt', 'no-new-privileges',  // block setuid privilege escalation
    '-w', '/work',
    language.docker_image, 'sleep', String(CONTAINER_TTL_S)]);
  if (started.code !== 0) throw new Error(`container start failed: ${started.stderr.trim() || started.stdout.trim()}`);
  const cid = started.stdout.trim();

  try {
    // write the source into the container (stdin -> file: no host path, no shell injection)
    await run(['exec', '-i', cid, 'sh', '-c', `cat > /work/${srcName}`], { input: submission.source_code });

    // compile (compiled languages only) — failure ends judging as compilation_error
    if (language.compile_command) {
      const c = await run(['exec', '-w', '/work', cid, 'sh', '-c', `timeout ${COMPILE_TIMEOUT_S} ${language.compile_command}`],
        { timeoutMs: (COMPILE_TIMEOUT_S + 10) * 1000 });
      if (c.code !== 0) {
        await finalize(submission, 'compilation_error',
          testCases.map((tc) => ({ test_case_id: tc.id, status: 'skipped' })),
          { compiler_output: (c.stdout + c.stderr).slice(0, OUTPUT_CAP) });
        return;
      }
    }

    // ponytail: assumes GNU coreutils `timeout` (exit 124 on TLE); busybox/Alpine returns
    // 143 and would mis-map to runtime_error — keep language images glibc-based.
    const timeoutSec = String(problem.time_limit_ms / 1000);
    const perTest: TestResultRow[] = [];
    let overall = 'accepted';
    let maxRuntime = 0;
    for (const tc of testCases) {
      const t0 = Date.now();
      const r = await run(['exec', '-i', '-w', '/work', cid, 'sh', '-c', `timeout ${timeoutSec} ${language.run_command}`],
        { input: tc.input, timeoutMs: problem.time_limit_ms + 15_000 });
      const runtimeMs = Date.now() - t0;
      maxRuntime = Math.max(maxRuntime, runtimeMs);
      const status = verdictFromRun(r, tc.expected_output);
      if (status !== 'accepted' && overall === 'accepted') overall = status; // first failing verdict wins
      perTest.push({
        test_case_id: tc.id, status, runtime_ms: runtimeMs, memory_kb: null,
        stdout: r.stdout.slice(0, OUTPUT_CAP), stderr: r.stderr.slice(0, OUTPUT_CAP),
      });
      // ponytail: judge every test (no early-exit) so the submitter sees all results;
      // add early-exit-on-fail when a problem grows to thousands of hidden cases.
    }
    await finalize(submission, overall, perTest, { runtime_ms: maxRuntime });
  } finally {
    await run(['rm', '-f', cid]).catch(() => {});
  }
}

// wipe any prior results (safe to re-judge), write per-test rows, set the submission verdict
async function finalize(
  submission: submissions,
  status: string,
  perTest: TestResultRow[],
  { compiler_output = null, runtime_ms = null }: { compiler_output?: string | null; runtime_ms?: number | null } = {}
): Promise<void> {
  await prisma.$transaction([
    prisma.submission_test_results.deleteMany({ where: { submission_id: submission.id } }),
    ...perTest.map((r) => prisma.submission_test_results.create({ data: { submission_id: submission.id, ...r } })),
    prisma.submissions.update({
      where: { id: submission.id },
      data: { status, runtime_ms, memory_kb: null, compiler_output, completed_at: new Date() },
    }),
  ]);
}

// atomically grab the oldest queued submission (queued -> judging). Safe for >1 worker.
export async function claimNext(): Promise<bigint | null> {
  const next = await prisma.submissions.findFirst({ where: { status: 'queued' }, orderBy: { submitted_at: 'asc' } });
  if (!next) return null;
  const claimed = await prisma.submissions.updateMany({ where: { id: next.id, status: 'queued' }, data: { status: 'judging' } });
  return claimed.count === 1 ? next.id : null;
}
