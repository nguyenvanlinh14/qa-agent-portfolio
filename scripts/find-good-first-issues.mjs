// Finds open "good first issue" tickets in the OSS projects we contribute to and writes
// dist/data/oss-issues.json for the homepage. Best effort: it never fails the build.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'data', 'oss-issues.json');

const REPOS = [
  'microsoft/playwright',
  'microsoft/playwright-mcp',
  'grafana/k6',
  'grafana/k6-docs',
  'allure-framework/allure-js',
  'testing-library/dom-testing-library',
];
const PER_REPO = 3;
const MAX_TOTAL = 15;

async function search(repo) {
  const q = `repo:${repo} label:"good first issue" is:issue is:open`;
  const url = `https://api.github.com/search/issues?${new URLSearchParams({ q, sort: 'updated', order: 'desc', per_page: String(PER_REPO) })}`;
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'qa-agent-portfolio' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.items ?? [])
    .filter((i) => !i.pull_request)
    .map((i) => ({
      repo,
      number: i.number,
      title: i.title,
      url: i.html_url,
      labels: (i.labels ?? []).map((l) => l.name),
      updatedAt: i.updated_at,
    }));
}

async function main() {
  const issues = [];
  let ok = 0;
  for (const repo of REPOS) {
    try {
      issues.push(...(await search(repo)));
      ok++;
    } catch (err) {
      console.warn(`oss-issues: ${repo} skipped (${err.message})`);
    }
  }

  if (ok === 0) {
    if (existsSync(OUT)) return console.warn('oss-issues: GitHub unreachable, keeping the existing file');
    console.warn('oss-issues: GitHub unreachable, writing an empty list');
  }

  issues.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const result = { generatedAt: new Date().toISOString(), issues: issues.slice(0, MAX_TOTAL) };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`oss-issues: ${result.issues.length} issues from ${ok}/${REPOS.length} repos -> dist/data/oss-issues.json`);
}

try {
  await main();
} catch (err) {
  console.warn(`oss-issues: ${err?.message ?? err}`);
}
process.exit(0);
