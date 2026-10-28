// Before / after comparison of two k6 summaries (handleSummary JSON), endpoint by endpoint.
// Used to prove a performance fix: run the same script before and after, then compare.
//   node scripts/k6-compare.mjs reports/before/k6-stress-summary.json reports/k6-stress-summary.json [--limit 1.2] [--min-ms 5]
// Exit code 1 when any p95 got worse by more than --limit (default 1.2 = +20 %) AND by at least --min-ms (default 5 ms),
// so sub-millisecond noise on a fast endpoint never fails the gate. Usable as a CI gate.
import { readFileSync, appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, dflt) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : dflt);
const LIMIT = flag('--limit', 1.2);
const MIN_MS = flag('--min-ms', 5);
const files = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (files.length !== 2) {
  console.error('usage: node scripts/k6-compare.mjs <before-summary.json> <after-summary.json> [--limit 1.2] [--min-ms 5]');
  process.exit(2);
}

/** Every http_req_duration series with a p(95): the overall one and each {endpoint:…} / {phase:…} sub-metric. */
function series(file) {
  const { metrics } = JSON.parse(readFileSync(file, 'utf8'));
  const out = new Map();
  for (const [name, m] of Object.entries(metrics)) {
    if (!name.startsWith('http_req_duration')) continue;
    const p95 = m.values?.['p(95)'];
    if (typeof p95 === 'number') out.set(name === 'http_req_duration' ? 'overall' : name.replace(/^http_req_duration\{(.*)\}$/, '$1'), p95);
  }
  const failed = metrics.http_req_failed?.values?.rate ?? 0;
  const reqs = metrics.http_reqs?.values?.count ?? 0;
  return { p95: out, failed, reqs };
}

const [before, after] = files.map(series);
const names = [...new Set([...before.p95.keys(), ...after.p95.keys()])].sort((a, b) => (a === 'overall' ? -1 : b === 'overall' ? 1 : a.localeCompare(b)));
const fmt = (n) => (n === undefined ? '—' : `${n.toFixed(1)} ms`);
let worse = 0;
const rows = names.map((n) => {
  const b = before.p95.get(n);
  const a = after.p95.get(n);
  const ratio = b && a ? a / b : undefined;
  const small = b !== undefined && a !== undefined && Math.abs(a - b) < MIN_MS;
  const verdict = ratio === undefined ? 'n/a' : small ? 'same' : ratio > LIMIT ? 'WORSE' : ratio < 1 / LIMIT ? 'better' : 'same';
  if (verdict === 'WORSE') worse++;
  return `| ${n} | ${fmt(b)} | ${fmt(a)} | ${ratio === undefined ? '—' : `${ratio >= 1 ? '+' : ''}${((ratio - 1) * 100).toFixed(0)} %`} | ${verdict} |`;
});

const md = [
  `### k6 before / after (p95; worse = over ×${LIMIT} and over ${MIN_MS} ms)`,
  '',
  `Requests ${before.reqs} → ${after.reqs} · error rate ${(before.failed * 100).toFixed(2)} % → ${(after.failed * 100).toFixed(2)} %`,
  '',
  '| Series | Before | After | Change | Verdict |',
  '|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
process.exit(worse > 0 ? 1 : 0);
