const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = opt('base', 'http://localhost:4000').replace(/\/$/, '');
const PASSWORD = opt('password', 'password123');
const READERS = Number(opt('readers', '50'));
const USERNAMES = opt(
  'users',
  'committee1,committee2,committee3,committee4,committee5,staff1,team-leader1',
).split(',');

if (!flag('yes')) {
  console.log(
    `This WRITES scores, approvals and PDFs through ${BASE} (whatever database that backend uses).\n` +
      `Re-run with --yes to proceed. Afterwards: npm run reset:test -- --yes`,
  );
  process.exit(1);
}

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function call(method, path, token, body) {
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, ms: performance.now() - started };
}

const percentile = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
};

async function login(username) {
  const r = await call('POST', '/auth/login', null, { username, password: PASSWORD });
  if (r.status !== 200) {
    console.log(`  skip ${username}: login ${r.status}`);
    return null;
  }
  return { username, token: r.json.token, role: r.json.user.role };
}

async function main() {
  console.log(`Target: ${BASE}\n`);
  const accounts = (await Promise.all(USERNAMES.map(login))).filter(Boolean);
  const judges = accounts.filter((a) => a.role === 'COMMITTEE' || a.role === 'STAFF');
  const leaders = accounts.filter((a) => a.role === 'TEAM_LEADER');
  console.log(
    `Logged in: ${judges.length} judges, ${leaders.length} team leaders\n`,
  );
  if (judges.length === 0) throw new Error('No judge accounts could log in.');

  // What each judge can see.
  const mine = new Map();
  for (const j of judges) {
    const r = await call('GET', '/queue/mine', j.token);
    if (r.status !== 200) throw new Error(`GET /queue/mine failed for ${j.username}: ${r.status}`);
    mine.set(j.username, r.json);
  }

  console.log('1. Claim race');
  const byProblem = new Map();
  for (const j of judges) {
    for (const p of mine.get(j.username).problemNumbers) {
      byProblem.set(p, [...(byProblem.get(p) ?? []), j]);
    }
  }

  const claimed = new Set();
  const winners = []; // { judge, item }
  for (const [problem, users] of [...byProblem.entries()].sort((a, b) => a[0] - b[0])) {
    const contenders = users.filter((u) => !claimed.has(u.username));
    if (contenders.length === 0) continue;
    const view = mine.get(contenders[0].username);
    const item = view.items
      .filter((i) => i.problemNumber === problem && i.status === 'WAITING')
      .sort((a, b) => a.position - b.position)[0];
    if (!item) {
      console.log(`  skip problem ${problem}: no WAITING item (run reset:test?)`);
      continue;
    }
    contenders.forEach((c) => claimed.add(c.username));
    const results = await Promise.all(
      contenders.flatMap((c) =>
        [0, 1].map(() =>
          call('POST', `/queue/${item.id}/claim`, c.token).then((r) => ({ c, r })),
        ),
      ),
    );
    const ok = results.filter((x) => x.r.status === 200);
    const bad = results.filter((x) => ![200, 409].includes(x.r.status));
    check(
      ok.length === 1 && bad.length === 0,
      `problem ${problem}: ${results.length} concurrent claims (${contenders.length} users)`,
      `${ok.length} won, ${results.filter((x) => x.r.status === 409).length} got 409, ${bad.length} unexpected`,
    );
    if (ok.length === 1) winners.push({ judge: ok[0].c, item });
  }

  console.log('\n2. Concurrent score submission');
  const submitResults = await Promise.all(
    winners.map(async ({ judge, item }) => {
      const students = item.school.students;
      const scores = students.map((s) => ({
        studentId: s.id,
        value: Math.round(Math.random() * 20) / 2, // 0.0–10.0 in 0.5 steps
      }));
      const r = await call('POST', `/queue/${item.id}/score`, judge.token, { scores });
      return { judge, item, r, count: students.length };
    }),
  );
  for (const { judge, item, r, count } of submitResults) {
    check(
      r.status === 200,
      `${judge.username} scored problem ${item.problemNumber} (${count} students)`,
      `HTTP ${r.status}, ${r.ms.toFixed(0)} ms${r.status === 200 ? '' : ` ${JSON.stringify(r.json)}`}`,
    );
  }

  console.log('\n3. Concurrent approval');
  const submittedIds = new Set(submitResults.filter((s) => s.r.status === 200).map((s) => s.item.id));
  for (const leader of leaders) {
    const pending = await call('GET', '/team-leader/approvals', leader.token);
    if (pending.status !== 200) {
      check(false, `${leader.username}: list pending`, `HTTP ${pending.status}`);
      continue;
    }

    const ours = pending.json.filter((i) => submittedIds.has(i.id));
    if (ours.length === 0) {
      console.log(`  ${leader.username}: none of this run's items are in their school`);
      continue;
    }
    const results = await Promise.all(
      ours.map((i) => call('POST', `/team-leader/approvals/${i.id}/approve`, leader.token)),
    );
    const failed = results.filter((r) => r.status >= 300);
    check(
      failed.length === 0,
      `${leader.username}: approved ${ours.length} items in parallel`,
      failed.length ? `${failed.length} failed: ${failed.map((f) => f.status).join(',')}` : '',
    );
  }

  console.log(`\n4. ${READERS} parallel reads`);
  const reads = await Promise.all([
    ...Array.from({ length: READERS }, () => call('GET', '/queue', null)),
    ...Array.from({ length: READERS }, (_, i) =>
      call('GET', '/queue/mine', judges[i % judges.length].token),
    ),
  ]);
  const bad = reads.filter((r) => r.status !== 200);
  const times = reads.map((r) => r.ms);
  check(
    bad.length === 0,
    `${reads.length} requests`,
    `p50 ${percentile(times, 50).toFixed(0)} ms, p95 ${percentile(times, 95).toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`,
  );

  console.log(
    failures === 0
      ? '\nAll checks passed. Rewind with: npm run reset:test -- --yes'
      : `\n${failures} check(s) FAILED.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
