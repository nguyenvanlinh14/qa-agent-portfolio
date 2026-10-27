// Mirrors new comments on upstream issues we contribute to (docs/oss/watch.json) into one tracking
// issue per upstream issue in this repo, labelled `oss-watch`. Runs from .github/workflows/oss-watch.yml.
// Comments by the repo owner are skipped; mirrored comment ids are stored as markers for de-duplication.
import { readFileSync } from 'node:fs';

const API = 'https://api.github.com';
const SELF = process.env.GITHUB_REPOSITORY ?? 'nguyenvanlinh14/qa-agent-portfolio';
const OWNER = SELF.split('/')[0].toLowerCase();
const LABEL = 'oss-watch';
const headers = {
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  'user-agent': 'qa-agent-portfolio-oss-watch',
};

async function gh(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function all(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

// Upstream text is untrusted: quote it and break @mentions so mirroring never pings anyone.
const quote = (body) =>
  String(body ?? '')
    .replace(/@(?=\w)/g, '@​')
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');

async function trackingIssue({ repo, number, title }) {
  const name = `OSS watch: ${repo}#${number}`;
  const open = await all(`/repos/${SELF}/issues?labels=${LABEL}&state=all`);
  const found = open.find((i) => i.title === name);
  if (found) return found;
  return gh(`/repos/${SELF}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title: name,
      labels: [LABEL],
      body: `Tracking replies on https://github.com/${repo}/issues/${number}${title ? ` (${title})` : ''}.\n\nNew upstream comments are mirrored here by \`scripts/oss-watch.mjs\`.`,
    }),
  });
}

async function watch(item) {
  const upstream = await all(`/repos/${item.repo}/issues/${item.number}/comments`);
  const fresh = upstream.filter((c) => c.user?.login?.toLowerCase() !== OWNER);
  const tracker = await trackingIssue(item);
  const mirrored = new Set(
    (await all(`/repos/${SELF}/issues/${tracker.number}/comments`)).flatMap((c) =>
      [...String(c.body).matchAll(/<!-- oss-watch:(\d+) -->/g)].map((m) => m[1]),
    ),
  );
  const todo = fresh.filter((c) => !mirrored.has(String(c.id)));
  for (const c of todo) {
    const who = c.author_association && c.author_association !== 'NONE' ? `${c.user.login} (${c.author_association.toLowerCase()})` : c.user.login;
    await gh(`/repos/${SELF}/issues/${tracker.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: `<!-- oss-watch:${c.id} -->\n**${who}** replied on ${c.created_at.slice(0, 10)} — ${c.html_url}\n\n${quote(c.body)}`,
      }),
    });
  }
  if (todo.length && tracker.state === 'closed') {
    await gh(`/repos/${SELF}/issues/${tracker.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'open' }) });
  }
  console.log(`oss-watch: ${item.repo}#${item.number}: ${todo.length} new comment(s) -> #${tracker.number}`);
}

// Pull requests the owner opened in other repositories are watched automatically.
async function ownPullRequests() {
  const q = `is:pr author:${OWNER} -user:${OWNER}`;
  const data = await gh(`/search/issues?${new URLSearchParams({ q, sort: 'updated', per_page: '50' })}`);
  return data.items.map((i) => ({
    repo: i.repository_url.split('/repos/')[1],
    number: i.number,
    title: `PR: ${i.title}`,
  }));
}

const list = JSON.parse(readFileSync(new URL('../docs/oss/watch.json', import.meta.url), 'utf8'));
try {
  for (const pr of await ownPullRequests()) {
    if (!list.some((i) => i.repo === pr.repo && i.number === pr.number)) list.push(pr);
  }
} catch (err) {
  console.error(`oss-watch: PR discovery failed: ${err.message}`);
}
let failed = 0;
for (const item of list) {
  try {
    await watch(item);
  } catch (err) {
    failed++;
    console.error(`oss-watch: ${item.repo}#${item.number}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
