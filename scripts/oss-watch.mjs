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

// Everything worth hearing about on an upstream issue or PR, as uniform events. Bots are skipped.
async function events(item) {
  const base = `/repos/${item.repo}`;
  const issue = await gh(`${base}/issues/${item.number}`);
  // Prow-style bots (volcano-sh-bot, k8s-ci-robot) are plain User accounts, so match their names too.
  const human = (u) => u && u.type !== 'Bot' && !/(\[bot\]|-bot|-robot)$/i.test(u.login) && u.login.toLowerCase() !== OWNER;
  const out = (await all(`${base}/issues/${item.number}/comments`))
    .filter((c) => human(c.user))
    .map((c) => ({ id: String(c.id), user: c.user, assoc: c.author_association, at: c.created_at, url: c.html_url, what: 'commented', body: c.body }));
  if (issue.pull_request) {
    for (const r of await all(`${base}/pulls/${item.number}/reviews`)) {
      if (!human(r.user) || (r.state === 'COMMENTED' && !r.body)) continue;
      const verdict = { APPROVED: 'approved', CHANGES_REQUESTED: 'requested changes', DISMISSED: 'dismissed a review' }[r.state] ?? 'reviewed';
      out.push({ id: `r${r.id}`, user: r.user, assoc: r.author_association, at: r.submitted_at, url: r.html_url, what: verdict, body: r.body });
    }
    for (const c of await all(`${base}/pulls/${item.number}/comments`)) {
      if (!human(c.user)) continue;
      out.push({ id: `c${c.id}`, user: c.user, assoc: c.author_association, at: c.created_at, url: c.html_url, what: `commented on \`${c.path}:${c.line ?? c.original_line ?? ''}\``, body: c.body });
    }
    // CI on the PR head: one event per failed check, plus one when everything is green.
    const pr = await gh(`${base}/pulls/${item.number}`);
    const runs = (await gh(`${base}/commits/${pr.head.sha}/check-runs?per_page=100`)).check_runs ?? [];
    const sha = pr.head.sha.slice(0, 7);
    for (const r of runs.filter((r) => ['failure', 'timed_out', 'action_required'].includes(r.conclusion))) {
      out.push({ id: `ci${sha}${r.id}`, user: { login: 'CI' }, at: r.completed_at ?? pr.updated_at, url: r.html_url, what: `check **${r.name}** ${r.conclusion} on ${sha}`, body: r.output?.title ?? '' });
    }
    const done = runs.length && runs.every((r) => r.status === 'completed');
    if (done && runs.every((r) => ['success', 'skipped', 'neutral'].includes(r.conclusion))) {
      out.push({ id: `cigreen${sha}`, user: { login: 'CI' }, at: pr.updated_at, url: `${issue.html_url}/checks`, what: `all ${runs.length} checks passed on ${sha} ✅`, body: '' });
    }
    if (issue.pull_request.merged_at) {
      out.push({ id: `merged${item.number}`, user: { login: 'GitHub' }, at: issue.pull_request.merged_at, url: issue.html_url, what: 'merged the PR 🎉', body: '' });
    }
  }
  if (issue.state === 'closed' && !issue.pull_request?.merged_at) {
    out.push({ id: `closed${item.number}`, user: issue.closed_by ?? { login: 'GitHub' }, at: issue.closed_at, url: issue.html_url, what: `closed it (${issue.state_reason ?? 'closed'})`, body: '' });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

async function watch(item) {
  const tracker = await trackingIssue(item);
  const mirrored = new Set(
    (await all(`/repos/${SELF}/issues/${tracker.number}/comments`)).flatMap((c) =>
      [...String(c.body).matchAll(/<!-- oss-watch:(\w+) -->/g)].map((m) => m[1]),
    ),
  );
  const todo = (await events(item)).filter((e) => !mirrored.has(e.id));
  for (const e of todo) {
    const who = e.assoc && e.assoc !== 'NONE' ? `${e.user.login} (${e.assoc.toLowerCase()})` : e.user.login;
    await gh(`/repos/${SELF}/issues/${tracker.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: `<!-- oss-watch:${e.id} -->\n**${who}** ${e.what} on ${e.at.slice(0, 10)} — ${e.url}${e.body ? `\n\n${quote(e.body)}` : ''}`,
      }),
    });
  }
  if (todo.length && tracker.state === 'closed') {
    await gh(`/repos/${SELF}/issues/${tracker.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'open' }) });
  }
  console.log(`oss-watch: ${item.repo}#${item.number}: ${todo.length} new event(s) -> #${tracker.number}`);
}

// watch.json entries may name a PR by its head branch ("owner:branch") instead of a number.
async function resolveHead(item) {
  const prs = await gh(`/repos/${item.repo}/pulls?${new URLSearchParams({ head: item.head, state: 'all' })}`);
  if (!prs.length) throw new Error(`no PR yet for ${item.head}`);
  return { repo: item.repo, number: prs[0].number, title: `PR: ${prs[0].title}` };
}

// Pull requests the owner opened in other repositories are watched automatically.
async function ownPullRequests() {
  const q = `is:pr author:${OWNER}`;
  const data = await gh(`/search/issues?${new URLSearchParams({ q, sort: 'updated', per_page: '50' })}`);
  const foreign = data.items.filter((i) => !i.repository_url.toLowerCase().includes(`/repos/${OWNER}/`));
  console.log(`oss-watch: search "${q}": ${data.total_count} PR(s), ${foreign.length} in other repositories`);
  return foreign.map((i) => ({
    repo: i.repository_url.split('/repos/')[1],
    number: i.number,
    title: `PR: ${i.title}`,
  }));
}

const list = [];
for (const item of JSON.parse(readFileSync(new URL('../docs/oss/watch.json', import.meta.url), 'utf8'))) {
  try {
    list.push(item.head ? await resolveHead(item) : item);
  } catch (err) {
    console.log(`oss-watch: ${item.repo} ${item.head}: ${err.message}`);
  }
}
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
