// OSS scout: finds open, unassigned "good first issue"-style tickets in the projects we
// follow, scores them and writes dist/data/oss-issues.json for the homepage (top 12).
// With --detail it also writes reports/oss-candidates.json and docs/oss/candidates.md (+ job summary).
// Best effort: it never fails the build. OSS_FIXTURE=<file.json> (array of GitHub search items,
// each with repository_url) replaces the network, for testing the scoring and markdown path.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'data', 'oss-issues.json');
const CANDIDATES_JSON = join(ROOT, 'reports', 'oss-candidates.json');
const CANDIDATES_MD = join(ROOT, 'docs', 'oss', 'candidates.md');
const DETAIL = process.argv.includes('--detail');

const REPOS = [
  { repo: 'microsoft/playwright', labels: ['open-to-a-pull-request', 'good first issue', 'help wanted'] },
  { repo: 'microsoft/playwright-mcp', labels: ['good first issue', 'help wanted'] },
  { repo: 'grafana/k6', labels: ['good first issue', 'help wanted'] },
  { repo: 'grafana/k6-docs', labels: ['good first issue', 'help wanted'] },
  { repo: 'allure-framework/allure-js', labels: ['good first issue', 'help wanted'] },
  { repo: 'testing-library/dom-testing-library', labels: ['good first issue', 'help wanted'] },
  { repo: 'microsoft/playwright-vscode', labels: ['open-to-a-pull-request', 'good first issue', 'help wanted'] },
];
const PER_REPO = 10;
const HOME_TOTAL = 12;
const TOP_N = 10;
const DAY = 86_400_000;

const BOOST = /doc|test|types?|ci|good first/i;
const PENALTY = /stale|needs-?investigation|blocked|wontfix|question/i;

// Score 0-100 (higher = better first contribution):
//   freshness  0..40  40 * (1 - ageDays / 365) by updatedAt, floored at 0
//   comments   0..25  0 -> 15 (nobody reacted yet), 1-5 -> 25, 6-10 -> 15, 11-20 -> 8, >20 -> 0
//   base       20
//   labels     +5 per label matching BOOST (max +15), -10 per label matching PENALTY (max -30)
//   long body  -10 when the body is over 4000 chars (hard to scope)
function score(issue, now = Date.now()) {
  const ageDays = Math.max(0, (now - Date.parse(issue.updatedAt)) / DAY);
  const fresh = 40 * Math.max(0, 1 - ageDays / 365);
  const c = issue.comments;
  const talk = c === 0 ? 15 : c <= 5 ? 25 : c <= 10 ? 15 : c <= 20 ? 8 : 0;
  const boost = Math.min(15, 5 * issue.labels.filter((l) => BOOST.test(l)).length);
  const penalty = Math.min(30, 10 * issue.labels.filter((l) => PENALTY.test(l)).length);
  const long = (issue.bodyLength ?? 0) > 4000 ? 10 : 0;
  return Math.round(Math.min(100, Math.max(0, fresh + talk + 20 + boost - penalty - long)));
}

const excerpt = (body) =>
  String(body ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(`{3,}|~{3,})[\s\S]*?(\1|$)/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 800)
    .trim();

async function search(repo, labels) {
  if (process.env.OSS_FIXTURE) {
    const items = JSON.parse(readFileSync(process.env.OSS_FIXTURE, 'utf8'));
    return items.filter((i) => i.repository_url?.endsWith(`/repos/${repo}`));
  }
  // One plain query per label (OR-ed labels and -linked:pr silently matched nothing), then
  // filter freshness and assignees client-side.
  const since = Date.now() - 365 * DAY;
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'qa-agent-portfolio' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const byNumber = new Map();
  let ok = 0;
  for (const label of labels) {
    const q = `repo:${repo} label:"${label}" is:issue is:open`;
    const url = `https://api.github.com/search/issues?${new URLSearchParams({ q, sort: 'updated', order: 'desc', per_page: String(PER_REPO) })}`;
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log(`oss-issues: ${repo} "${label}": ${data.total_count ?? 0} open`);
      for (const i of data.items ?? []) byNumber.set(i.number, i);
      ok++;
    } catch (err) {
      console.warn(`oss-issues: ${repo} "${label}" failed (${err.message})`);
    }
  }
  if (!ok) throw new Error('all label queries failed');
  return [...byNumber.values()].filter(
    (i) => !i.pull_request && !(i.assignees?.length || i.assignee) && Date.parse(i.updated_at) >= since,
  );
}

function toIssue(repo, i) {
  return {
    repo,
    number: i.number,
    title: i.title,
    url: i.html_url,
    labels: (i.labels ?? []).map((l) => l.name),
    updatedAt: i.updated_at,
    createdAt: i.created_at,
    comments: i.comments ?? 0,
    bodyLength: (i.body ?? '').length,
    bodyExcerpt: excerpt(i.body),
  };
}

// Untrusted text going into a markdown table cell / link text.
const cell = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[|[\]`\\]/g, '\\$&');
const day = (iso) => String(iso).slice(0, 10);

function row(i, withRepo = false) {
  const labels = i.labels.map((l) => `\`${l.replace(/[`|\n]/g, '')}\``).join(' ');
  const ref = `${withRepo ? i.repo.split('/')[1] : ''}#${i.number}`;
  return `| ${i.score} | [${ref}](${i.url}) | ${cell(i.title)} | ${labels} | ${i.comments} | ${day(i.updatedAt)} |`;
}

const HEAD = '| Score | Issue | Title | Labels | Comments | Updated |\n|---:|---|---|---|---:|---|';

const topTable = (top) => `${HEAD}\n${top.map((i) => row(i, true)).join('\n')}`;

function markdown(all, date) {
  const top = all.slice(0, TOP_N);
  const out = [
    '---',
    'title: OSS candidates',
    'short: OSS candidates',
    'icon: git',
    '---',
    '',
    '# OSS candidates',
    '',
    `Trang này được tạo tự động bởi workflow oss-scout (\`scripts/find-good-first-issues.mjs --detail\`) vào ${date}. Điểm càng cao càng đáng thử trước; xem cách tính trong [OSS Playbook](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docs/open-source-playbook.md).`,
    '',
  ];
  for (const { repo } of REPOS) {
    const rows = all.filter((i) => i.repo === repo);
    out.push(`## ${repo}`, '');
    out.push(rows.length ? `${HEAD}\n${rows.map((i) => row(i)).join('\n')}` : 'Không có issue phù hợp.', '');
  }
  out.push('## Top 10', '');
  for (const i of top) {
    out.push(
      `<details>`,
      `<summary><b>${i.score}</b> · ${cell(i.repo)}#${i.number}: ${cell(i.title)}</summary>`,
      '',
      `[Mở issue trên GitHub](${i.url})`,
      '',
      i.bodyExcerpt ? `\`\`\`text\n${i.bodyExcerpt.replace(/`{3,}/g, "''")}\n\`\`\`` : '_(không có mô tả)_',
      '',
      '</details>',
      '',
    );
  }
  return `${out.join('\n')}\n`;
}

function writeDetail(all, date) {
  mkdirSync(dirname(CANDIDATES_JSON), { recursive: true });
  const json = all.map(({ bodyLength, ...i }) => i);
  writeFileSync(CANDIDATES_JSON, `${JSON.stringify({ generatedAt: new Date().toISOString(), issues: json }, null, 2)}\n`);
  mkdirSync(dirname(CANDIDATES_MD), { recursive: true });
  writeFileSync(CANDIDATES_MD, markdown(all, date));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## OSS scout: top ${TOP_N}\n\n${topTable(all.slice(0, TOP_N))}\n`);
  }
  console.log('oss-scout: wrote reports/oss-candidates.json and docs/oss/candidates.md');
}

async function main() {
  const all = [];
  let ok = 0;
  for (const { repo, labels } of REPOS) {
    try {
      all.push(...(await search(repo, labels)).filter((i) => !i.pull_request).map((i) => toIssue(repo, i)));
      ok++;
    } catch (err) {
      console.warn(`oss-issues: ${repo} skipped (${err.message})`);
    }
  }

  if (ok === 0) {
    if (existsSync(OUT)) return console.warn('oss-issues: GitHub unreachable, keeping the existing files');
    console.warn('oss-issues: GitHub unreachable, writing an empty list');
  }

  for (const i of all) i.score = score(i);
  all.sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));

  const issues = all.slice(0, HOME_TOTAL).map(({ repo, number, title, url, labels, updatedAt }) => ({ repo, number, title, url, labels, updatedAt }));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), issues }, null, 2)}\n`);
  console.log(`oss-issues: ${issues.length} issues from ${ok}/${REPOS.length} repos -> dist/data/oss-issues.json`);

  if (DETAIL && ok > 0) writeDetail(all, new Date().toISOString().slice(0, 10));
}

try {
  await main();
} catch (err) {
  console.warn(`oss-issues: ${err?.message ?? err}`);
}
process.exit(0);
