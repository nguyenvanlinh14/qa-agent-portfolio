// Evidence is expensive, so it is recorded once per UNIQUE bug, not once per red test.
// Reads reports/results.json, groups the failures by signature and matches them against evidence/registry.json:
//   node scripts/evidence/dedupe.mjs [reports/results.json]
// Signature = spec file + the first error line with the volatile parts (numbers, ids, quoted values, timings) masked.
// Output: "N failures → M unique (K known, U new)" + a table; also written to $GITHUB_STEP_SUMMARY in CI.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'reports/results.json';
if (!existsSync(file)) {
  console.log(`dedupe: ${file} not found — run the tests first`);
  process.exit(0);
}
const report = JSON.parse(readFileSync(file, 'utf8'));
const registry = existsSync('evidence/registry.json') ? JSON.parse(readFileSync('evidence/registry.json', 'utf8')) : { bugs: [] };

const clean = (s) =>
  String(s ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split('\n')
    .find((l) => l.trim())
    ?.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/(["'`]).*?\1/g, '<v>')
    .replace(/\d+(\.\d+)?\s*(ms|s)\b/g, '<t>')
    .replace(/\d+/g, '<n>')
    .trim() ?? '';

const failures = [];
(function walk(suites, file) {
  for (const s of suites ?? []) {
    for (const spec of s.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = t.results?.at(-1);
        if (t.status !== 'unexpected' || !last) continue;
        failures.push({ title: spec.title, project: t.projectName, file: spec.file ?? file, error: clean(last.error?.message) });
      }
    }
    walk(s.suites, s.file ?? file);
  }
})(report.suites);

const groups = new Map();
for (const f of failures) {
  // An environment failure (server down, auth expired) looks the same on every test: one finding, not N.
  const env = /ECONNREFUSED|net::ERR_|401|5\d\d|Target page, context or browser has been closed/.test(f.error);
  const sig = env ? `environment | ${f.error}` : `${f.file} | ${f.error}`;
  if (!groups.has(sig)) groups.set(sig, []);
  groups.get(sig).push(f);
}

const known = (sig, items) => registry.bugs.find((b) => (b.matches ?? []).some((m) => new RegExp(m).test(`${sig} | ${items.map((i) => i.title).join(' | ')}`)));
const rows = [...groups].map(([sig, items]) => {
  const bug = known(sig, items);
  return { sig, n: items.length, tests: items.map((i) => `${i.project}: ${i.title}`), bug };
});
const nKnown = rows.filter((r) => r.bug).length;
const md = [
  `### Failure dedupe: ${failures.length} failures → ${rows.length} unique (${nKnown} known, ${rows.length - nKnown} new)`,
  '',
  '| # | Signature | Tests | Evidence |',
  '|---|---|---|---|',
  ...rows.map((r, i) => `| ${i + 1} | \`${r.sig.replace(/\|/g, '\\|')}\` | ${r.n}: ${r.tests.slice(0, 3).join('; ')}${r.n > 3 ? ' …' : ''} | ${r.bug ? `known → ${r.bug.id}` : r.sig.startsWith('environment') ? 'environment: fix and re-run, no video' : '**new: record evidence**'} |`),
  '',
].join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
