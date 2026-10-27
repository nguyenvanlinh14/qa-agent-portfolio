// Bounty scout: finds PAID open-source issues (Algora-style "💎 Bounty" labels and similar) that suit a
// QA automation engineer, ranks them and writes reports/bounties.json + docs/oss/bounties.md (+ job summary).
// Best effort: it never fails the build (always exits 0). GitHub's global issue search is only reachable
// from CI, so BOUNTY_FIXTURE=<dir> replaces the network for testing. The dir holds:
//   search.json        array of GitHub search items (each with repository_url)
//   repos.json         map "owner/repo" -> { name, full_name, stargazers_count, created_at, fork, language, archived, topics }
//   paid.json          (optional) map "owner/repo" -> total_count of issues labelled "💰 Rewarded"
//   comments.json      map issue html_url -> array of comments ({ user: { login, type }, body })
//   contributing.json  map "owner/repo" -> CONTRIBUTING.md text
//
// Pipeline (every optional network call stops once the time budget is spent):
//   1. search (several queries)  2. repo info for ALL unique repos (cap 120) + hard legitimacy filter
//   3. payout history for the top 30 repos by stars  4. comments for the top 60 issues (legitimacy + freshness)
//   5. score, split off "crowded" issues (> 15 attempts), write the report.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = join(ROOT, 'reports', 'bounties.json');
const MD_OUT = join(ROOT, 'docs', 'oss', 'bounties.md');
const FIXTURE = process.env.BOUNTY_FIXTURE ? resolve(process.env.BOUNTY_FIXTURE) : null;

const DAY = 86_400_000;
const MAX_AGE_DAYS = 120; // issues not updated for this long are ignored
const MAX_REPOS = 120; // repos we fetch info for
const MIN_STARS = 200; // hard filter
const MIN_REPO_AGE_DAYS = 180; // hard filter: younger repos are dropped
const PAID_CHECK_REPOS = 30; // repos (by stars) whose payout history we look up
const MAX_DETAIL = 60; // issues we fetch comments for
const MAX_PER_REPO = 10; // ...at most this many per repo, so one big repo cannot fill the whole detail budget
const CROWDED_ABOVE = 15; // more attempts than this -> "Crowded" list, not ranked
const TOP_TABLE = 20;
const TOP_DETAILS = 10;
const TOP_CROWDED = 10;
const SEARCH_GAP_MS = 2500; // search API: 30 req/min authenticated
const API_GAP_MS = 200; // gap between the other REST calls
const TIMEOUT_MS = 15_000;
const DEADLINE_MS = 7 * 60_000; // stop optional calls after this, the job has a 10 minute timeout

// "Bounty farms": repos that exist to farm attempts, recognised by name.
const FARM_NAME = /bounty|bounties|hunter|hunters|livefire|airdrop/i;
// Repos that pay outside GitHub (no "💰 Rewarded" label to count): value = where they pay.
const OFF_PLATFORM = { 'Expensify/App': 'Upwork' };

const BOUNTY = 'label:"💎 Bounty"';
const QUERIES = [
  ...[
    `${BOUNTY} language:TypeScript`,
    `${BOUNTY} language:JavaScript`,
    `${BOUNTY} language:Go`,
    `${BOUNTY} language:Python`,
    `${BOUNTY} playwright`,
    `${BOUNTY} test in:title,body`,
    'label:bounty language:TypeScript',
    'label:bounty language:Go',
    'label:"bounty" playwright',
  ].map((q) => `${q} is:issue is:open`),
  // Expensify pays through Upwork; the amount is in the title ("[$250]"). Titles with HOLD are skipped later.
  'repo:Expensify/App is:issue is:open label:External label:"Help Wanted"',
  // Popular repos, so they are not drowned by the many small ones above. (If GitHub rejects `stars:` in issue
  // search the query just fails, is logged and skipped.)
  `${BOUNTY} stars:>500 is:issue is:open`,
];

const FIT_LANGS = new Set(['TypeScript', 'JavaScript', 'Go', 'Python']);
const FIT_WORDS = /\b(?:test|tests|testing|playwright|e2e|ci|flaky|lint|linting|typescript|cli)\b/i;

// Score 0-100 (higher = better bounty for a QA automation engineer; the best possible item scores 100):
//   amount       0..25  25 * log10(1 + min(usd, 1000)) / log10(1001), i.e. $1000+ -> 25 ($100 ~ 17, $10 ~ 9); unknown -> 0
//   competition  0..30  attempts 0 -> 30, 1 -> 24, 2-3 -> 16, 4-8 -> 8, 9-15 -> 2, more -> 0 (unknown comments -> 8)
//   legitimacy   0..25  stars: min(10, 10 * log10(stars) / log10(50000)); payout history: any "💰 Rewarded"
//                       issue in the repo -> +10, 10 or more -> +15 (unknown / off-platform payer -> +0)
//   freshness    0..10  10 * (1 - ageDays / 120) by updatedAt, floored at 0
//   fit          0..10  +5 repo language is TypeScript/JavaScript/Go/Python,
//                       +5 title/body/topics match test|playwright|e2e|ci|flaky|lint|typescript|cli
//   penalties           -10 amount unknown, -5 body longer than 6000 chars (hard to scope),
//                       -2 AI policy unknown (disclose = 0: fine; forbidden repos are dropped earlier)
//   (clamped to 0..100)
const legitimacy = (stars, paidCount) =>
  Math.min(10, stars > 0 ? (10 * Math.log10(stars)) / Math.log10(50_000) : 0) + (paidCount >= 10 ? 15 : paidCount > 0 ? 10 : 0);
const freshness = (updatedAt, now) => 10 * Math.max(0, 1 - Math.max(0, (now - Date.parse(updatedAt)) / DAY) / MAX_AGE_DAYS);

function score(i, now = Date.now()) {
  const amount = i.amount == null ? 0 : (25 * Math.log10(1 + Math.min(i.amount, 1000))) / Math.log10(1001);
  const a = i.attempts;
  const compete = a == null ? 8 : a === 0 ? 30 : a === 1 ? 24 : a <= 3 ? 16 : a <= 8 ? 8 : a <= 15 ? 2 : 0;
  const legit = legitimacy(i.stars ?? 0, i.paidCount ?? 0);
  const fit = (FIT_LANGS.has(i.language) ? 5 : 0) + (FIT_WORDS.test(`${i.title}\n${i.body}\n${i.topics.join(' ')}`) ? 5 : 0);
  const penalty = (i.amount == null ? 10 : 0) + (i.bodyLength > 6000 ? 5 : 0) + (i.aiPolicy === 'unknown' ? 2 : 0);
  return Math.round(Math.min(100, Math.max(0, amount + compete + legit + freshness(i.updatedAt, now) + fit - penalty)));
}

// ---------- text helpers ----------

const stripBody = (body) =>
  String(body ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(`{3,}|~{3,})[\s\S]*?(\1|$)/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const excerpt = (body) => stripBody(body).slice(0, 600).trim();

// All USD amounts in a text ("$100", "$1,000", "$2.5k", "500 USD"), with their position.
function amountsIn(text) {
  const found = [];
  const t = String(text ?? '');
  for (const m of t.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(\s?[kK]\b)?/g)) {
    const n = Number(m[1].replace(/,/g, '') + (m[2] ?? '')) * (m[3] ? 1000 : 1);
    found.push({ n, index: m.index, len: m[0].length });
  }
  for (const m of t.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d+)\s?USD\b/gi)) {
    found.push({ n: Number(m[1].replace(/,/g, '')), index: m.index, len: m[0].length });
  }
  return found.filter((f) => f.n >= 1 && f.n <= 100_000);
}

const largest = (nums) => (nums.length ? Math.max(...nums) : null);

const isBot = (c) => c.user?.type === 'Bot' || /\[bot\]$/i.test(c.user?.login ?? '') || /algora/i.test(c.user?.login ?? '');

// "[$250]" / "[HOLD for payment ...][$250]" in a title: the amount convention of Expensify and a few others.
const titleAmount = (title) =>
  largest(
    [...String(title ?? '').matchAll(/\[\s*\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*\]/g)]
      .map((m) => Number(m[1].replace(/,/g, '')))
      .filter((n) => n >= 1 && n <= 100_000),
  );

// Bounty amount: largest in a bounty-bot comment, else largest in the labels, else a "[$N]" title, else largest
// in the body (body amounts only count next to a bounty/reward/paid word, to ignore "$1" in shell snippets).
// With titleFirst (repos that pay off-platform, e.g. Expensify) the title is the only trusted source.
function findAmount(labels, body, comments, title, titleFirst = false) {
  const fromTitle = titleAmount(title);
  if (titleFirst) return fromTitle;
  const bot = comments.filter((c) => isBot(c) && /bounty|💎|reward/i.test(c.body ?? ''));
  const fromBots = largest(bot.flatMap((c) => amountsIn(c.body).map((a) => a.n)));
  if (fromBots != null) return fromBots;
  const fromLabels = largest(labels.flatMap((l) => amountsIn(l).map((a) => a.n)));
  if (fromLabels != null) return fromLabels;
  if (fromTitle != null) return fromTitle;
  const text = stripBody(body);
  return largest(
    amountsIn(text)
      .filter((a) => /bounty|reward|prize|paid|payout|💎|💰/i.test(text.slice(Math.max(0, a.index - 80), a.index + a.len + 80)))
      .map((a) => a.n),
  );
}

const ATTEMPT = /\/attempt\b|\b(?:i'?d like to work on|i would like to work on|can i work on|could i work on|assign (?:it |this )?(?:to )?me)\b/i;
const PROPOSAL = /^\s*#{0,4}\s*proposal\b/im; // Expensify: contributors post "## Proposal" comments
const OPENED_PR = /\/claim\b|(?:\bPRs?\b|pull request)[^\n]{0,80}#\d+|#\d+[^\n]{0,80}(?:\bPRs?\b|pull request)/i;
const REWARDED_LABEL = /rewarded|\bpaid\b|\bclaimed\b/i; // case-insensitive: covers "💰 Rewarded" and variants
const REWARDED_BOT =
  /\b(?:has|have) been (?:awarded|rewarded|paid)\b|\bbounty (?:has been |was |is )?(?:claimed|awarded|rewarded|paid)\b|🎉[^\n]*\b(?:awarded|rewarded)\b|\b(?:awarded|rewarded)\b[^\n]*\$\s?\d/i;

// Attempts = distinct human users with an attempt phrase, a /claim, or a mention of a PR they opened.
function findAttempts(comments) {
  const users = new Set();
  for (const c of comments) {
    if (isBot(c)) continue;
    const body = c.body ?? '';
    if (ATTEMPT.test(body) || OPENED_PR.test(body) || PROPOSAL.test(body)) users.add(c.user?.login ?? `anon-${users.size}`);
  }
  return users.size;
}

const isRewarded = (labels, comments) =>
  labels.some((l) => REWARDED_LABEL.test(l)) || comments.some((c) => isBot(c) && REWARDED_BOT.test(c.body ?? ''));

// AI policy from CONTRIBUTING.md: an AI term with a "forbidding" word nearby -> forbidden,
// with a "disclose" word nearby -> disclose, otherwise unknown.
const AI_TERM =
  /\b(?:AI|LLMs?|ChatGPT|Copilot|Claude|Gemini|GPT-?\d?)\b|\b(?:AI|LLM|machine|bot|auto)[- ]generated\b|\bgenerated (?:by|with|using) (?:an? )?(?:AI|LLM)/gi;
const AI_FORBID = /not allowed|disallow\w*|prohibit\w*|\bban(?:ned|s)?\b|forbid\w*|will be closed|not accepted|do not accept|don'?t accept|\bno (?:AI|LLM)/i;
const AI_DISCLOSE = /disclos\w*|must (?:mention|state|indicate|declare)/i;
function aiPolicy(text) {
  if (!text) return 'unknown';
  const t = String(text)
    .slice(0, 100_000)
    .replace(/\b(?:not|never|n't)\s+(?:be\s+)?(?:prohibit\w*|forbid\w*|ban\w*)/gi, ' ');
  let disclose = false;
  for (const m of t.matchAll(AI_TERM)) {
    const near = t.slice(Math.max(0, m.index - 150), m.index + m[0].length + 150);
    if (AI_FORBID.test(near)) return 'forbidden';
    if (AI_DISCLOSE.test(near)) disclose = true;
  }
  return disclose ? 'disclose' : 'unknown';
}

// ---------- network (or fixture) ----------

const started = Date.now();
const late = () => Date.now() - started > DEADLINE_MS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fixtures = new Map();
const fixture = (name, optional = false) => {
  if (!fixtures.has(name)) {
    const file = join(FIXTURE, name);
    fixtures.set(name, optional && !existsSync(file) ? {} : JSON.parse(readFileSync(file, 'utf8')));
  }
  return fixtures.get(name);
};

const headers = (accept = 'application/vnd.github+json') => {
  const h = { accept, 'user-agent': 'qa-agent-portfolio' };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
};

// Pacing: search calls >= SEARCH_GAP_MS apart, other REST calls >= API_GAP_MS apart.
const lastCall = { search: 0, api: 0 };
async function pace(kind) {
  const gap = kind === 'search' ? SEARCH_GAP_MS : API_GAP_MS;
  const wait = lastCall[kind] + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall[kind] = Date.now();
}

// GET against the GitHub API; returns { status, body } (body = parsed JSON, or text when raw). One retry
// when the API asks to wait a few seconds. Throws on network errors.
async function gh(path, { raw = false } = {}) {
  const kind = path.startsWith('/search/') ? 'search' : 'api';
  for (let attempt = 0; ; attempt++) {
    await pace(kind);
    const res = await fetch(`https://api.github.com${path}`, {
      headers: headers(raw ? 'application/vnd.github.raw+json' : undefined),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const wait = Number(res.headers.get('retry-after'));
    if ((res.status === 429 || res.status === 403) && wait > 0 && wait <= 30 && attempt === 0) {
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: raw ? await res.text() : await res.json() };
  }
}

async function searchAll() {
  if (FIXTURE) return { items: fixture('search.json'), ok: 1 };
  const byUrl = new Map();
  let ok = 0;
  for (const q of QUERIES) {
    try {
      const params = new URLSearchParams({ q, sort: 'updated', order: 'desc', per_page: '50' });
      const { status, body } = await gh(`/search/issues?${params}`);
      if (!body) throw new Error(`HTTP ${status}`);
      console.log(`bounties: ${body.total_count ?? 0} open for ${q}`);
      for (const i of body.items ?? []) if (i.html_url && !byUrl.has(i.html_url)) byUrl.set(i.html_url, i);
      ok++;
    } catch (err) {
      console.warn(`bounties: query failed (${q}): ${err.message}`);
    }
  }
  return { items: [...byUrl.values()], ok };
}

async function repoInfo(repo) {
  if (FIXTURE) return fixture('repos.json')[repo] ?? null;
  if (late()) return null;
  try {
    return (await gh(`/repos/${repo}`)).body;
  } catch (err) {
    console.warn(`bounties: repo ${repo} failed (${err.message})`);
    return null;
  }
}

// Payout history: number of issues in the repo carrying Algora's "💰 Rewarded" label (GitHub matches labels
// case-insensitively). null = unknown (out of time budget or request failed).
async function paidFor(repo) {
  if (FIXTURE) return fixture('paid.json', true)[repo] ?? 0;
  if (late()) return null;
  try {
    const params = new URLSearchParams({ q: `repo:${repo} label:"💰 Rewarded" is:issue`, per_page: '1' });
    const { body } = await gh(`/search/issues?${params}`);
    return body && Number.isInteger(body.total_count) ? body.total_count : null;
  } catch (err) {
    console.warn(`bounties: payout lookup ${repo} failed (${err.message})`);
    return null;
  }
}

async function commentsFor(item, repo) {
  if (FIXTURE) return fixture('comments.json')[item.html_url] ?? [];
  if (late()) return null;
  try {
    const { body } = await gh(`/repos/${repo}/issues/${item.number}/comments?per_page=100`);
    return body;
  } catch (err) {
    console.warn(`bounties: comments ${repo}#${item.number} failed (${err.message})`);
    return null;
  }
}

async function contributingFor(repo) {
  if (FIXTURE) return fixture('contributing.json')[repo] ?? null;
  for (const file of ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'contributingGuides/CONTRIBUTING.md']) {
    if (late()) return null;
    try {
      const { body } = await gh(`/repos/${repo}/contents/${file}`, { raw: true });
      if (body) return body;
    } catch (err) {
      console.warn(`bounties: ${repo}/${file} failed (${err.message})`);
    }
  }
  return null;
}

// ---------- pipeline ----------

const repoOf = (item) => /\/repos\/([\w.-]+\/[\w.-]+)$/.exec(item.repository_url ?? '')?.[1] ?? null;

// Why a repo is not trustworthy enough (null = fine). Needs repo info; without it we cannot vouch for the repo.
function repoVerdict(repo, info, now) {
  if (!info) return 'no repo info';
  if (info.archived) return 'archived';
  if (info.fork) return 'fork';
  if ((info.stargazers_count ?? 0) < MIN_STARS) return `< ${MIN_STARS} stars`;
  const created = Date.parse(info.created_at);
  if (created > now - MIN_REPO_AGE_DAYS * DAY) return `younger than ${MIN_REPO_AGE_DAYS} days`;
  if ([repo, info.name, info.full_name].some((n) => n && FARM_NAME.test(n))) return 'bounty farm';
  return null;
}

async function collect(rawItems) {
  const now = Date.now();
  const since = now - MAX_AGE_DAYS * DAY;
  const stats = { searched: 0, fresh: 0, repos: 0, afterRepoFilter: 0, detailed: 0, rewarded: 0, forbidden: 0, kept: 0, crowded: 0 };

  // 1. fresh, unassigned issues (and Expensify's "[$N]" convention)
  const seen = new Set();
  const candidates = [];
  for (const item of rawItems) {
    const repo = repoOf(item);
    if (!repo || !item.html_url?.startsWith('https://github.com/') || seen.has(item.html_url)) continue;
    seen.add(item.html_url);
    stats.searched++;
    if (item.pull_request || item.assignee || item.assignees?.length) continue;
    if (!(Date.parse(item.updated_at) >= since)) continue;
    if (repo in OFF_PLATFORM) {
      const title = String(item.title ?? '');
      if (/\bHOLD\b/i.test(title) || titleAmount(title) == null) continue; // on hold, or no price in the title
    }
    candidates.push({ item, repo });
  }
  stats.fresh = candidates.length;

  // 2. repo info for ALL unique repos (freshest first when over the cap), then the hard legitimacy filter
  const freshest = new Map();
  for (const { item, repo } of candidates) freshest.set(repo, Math.max(freshest.get(repo) ?? 0, Date.parse(item.updated_at)));
  const repoList = [...freshest.entries()].sort((a, b) => b[1] - a[1]).map(([repo]) => repo);
  const infos = new Map();
  for (const repo of repoList.slice(0, MAX_REPOS)) infos.set(repo, await repoInfo(repo));
  stats.repos = infos.size;
  const dropReasons = new Map();
  const goodRepos = new Map();
  for (const [repo, info] of infos) {
    const reason = repoVerdict(repo, info, now);
    if (reason) dropReasons.set(reason, [...(dropReasons.get(reason) ?? []), repo]);
    else goodRepos.set(repo, info);
  }
  for (const [reason, list] of dropReasons) console.log(`bounties: dropped ${list.length} repos (${reason}): ${list.slice(0, 8).join(', ')}${list.length > 8 ? ', ...' : ''}`);
  const usable = candidates.filter((c) => goodRepos.has(c.repo)).map((c) => ({ ...c, info: goodRepos.get(c.repo) }));
  stats.afterRepoFilter = usable.length;

  // 3. payout history for the top repos by stars
  const paid = new Map();
  const byStars = [...goodRepos.entries()].sort((a, b) => (b[1].stargazers_count ?? 0) - (a[1].stargazers_count ?? 0));
  for (const [repo] of byStars.filter(([r]) => !(r in OFF_PLATFORM)).slice(0, PAID_CHECK_REPOS)) paid.set(repo, await paidFor(repo));
  console.log(`bounties: payout history for ${paid.size} repos, ${[...paid.values()].filter((n) => n > 0).length} with rewarded issues`);

  // 4. comments for the top issues by pre-score = legitimacy + freshness (at most MAX_PER_REPO per repo)
  for (const u of usable) u.pre = legitimacy(u.info.stargazers_count, paid.get(u.repo) ?? 0) + freshness(u.item.updated_at, now);
  usable.sort((a, b) => b.pre - a.pre || b.item.updated_at.localeCompare(a.item.updated_at));
  const perRepo = new Map();
  const detail = [];
  for (const u of usable) {
    if (detail.length >= MAX_DETAIL) break;
    const n = perRepo.get(u.repo) ?? 0;
    if (n >= MAX_PER_REPO) continue;
    perRepo.set(u.repo, n + 1);
    detail.push(u);
  }

  const policies = new Map();
  const kept = [];
  const crowded = [];
  for (const { item, repo, info } of detail) {
    stats.detailed++;
    const labels = (item.labels ?? []).map((l) => l.name ?? '');
    const comments = await commentsFor(item, repo);
    if (isRewarded(labels, comments ?? [])) {
      stats.rewarded++;
      continue;
    }
    const attempts = comments ? findAttempts(comments) : null;
    const base = {
      repo,
      number: item.number,
      title: String(item.title ?? ''),
      url: item.html_url,
      amount: findAmount(labels, item.body, comments ?? [], item.title, repo in OFF_PLATFORM),
      attempts,
      stars: info.stargazers_count ?? null,
      createdAt: info.created_at ?? null,
      paidCount: paid.get(repo) ?? null,
      paidVia: OFF_PLATFORM[repo] ?? null,
      language: info.language ?? null,
      updatedAt: item.updated_at,
    };
    if (attempts != null && attempts > CROWDED_ABOVE) {
      crowded.push(base);
      continue;
    }
    if (!policies.has(repo)) policies.set(repo, aiPolicy(await contributingFor(repo)));
    const policy = policies.get(repo);
    if (policy === 'forbidden') {
      stats.forbidden++;
      continue;
    }
    const issue = {
      ...base,
      aiPolicy: policy,
      labels,
      excerpt: excerpt(item.body),
      body: stripBody(item.body),
      bodyLength: String(item.body ?? '').length,
      topics: info.topics ?? [],
    };
    issue.score = score(issue, now);
    kept.push(issue);
  }
  kept.sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));
  crowded.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0) || b.attempts - a.attempts);
  stats.kept = kept.length;
  stats.crowded = crowded.length;
  console.log(
    `bounties: searched ${stats.searched}, fresh+unassigned ${stats.fresh}, repos checked ${stats.repos}, after repo filter ${stats.afterRepoFilter}, ` +
      `after comments ${stats.detailed} (dropped ${stats.rewarded} rewarded), kept ${stats.kept} (dropped ${stats.forbidden} AI-forbidden), crowded ${stats.crowded}`,
  );
  return { kept, crowded };
}

// ---------- output ----------

// Untrusted text going into a markdown table cell / link text.
const cell = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[|[\]`\\]/g, '\\$&');
const day = (iso) => String(iso).slice(0, 10);
const money = (n) => (n == null ? '?' : `$${n.toLocaleString('en-US')}`);
const starsText = (n) => (n == null ? '?' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));
// Payout history: count of "💰 Rewarded" issues; 0 is flagged; off-platform payers show where they pay.
const paidText = (i) => (i.paidVia ? i.paidVia : i.paidCount == null ? '?' : i.paidCount === 0 ? '0 ⚠' : String(i.paidCount));
const link = (i) => `[${cell(i.repo)}#${i.number}](${i.url})`;

const HEAD = '| Score | $ | Issue | Title | Attempts | ★ stars | Paid before | Lang | AI | Updated |\n|---:|---:|---|---|---:|---:|---:|---|---|---|';
const row = (i) =>
  `| ${i.score} | ${money(i.amount)} | ${link(i)} | ${cell(i.title)} | ${i.attempts ?? '?'} | ${starsText(i.stars)} | ${paidText(i)} | ${cell(i.language ?? '-')} | ${i.aiPolicy} | ${day(i.updatedAt)} |`;
const CROWDED_HEAD = '| $ | Issue | Attempts |\n|---:|---|---:|';
const crowdedRow = (i) => `| ${money(i.amount)} | ${link(i)} | ${i.attempts} |`;

function markdown({ kept, crowded }, date) {
  const out = [
    '---',
    'title: Paid OSS bounties',
    'short: Bounties',
    'icon: git',
    '---',
    '',
    '# Paid OSS bounties',
    '',
    `Trang này được tạo tự động bởi workflow oss-scout (\`scripts/find-bounties.mjs\`) vào ${date}. Script tìm các issue đang mở có nhãn bounty (ví dụ \`💎 Bounty\` của Algora, hoặc \`[$250]\` trong tiêu đề của Expensify), chưa ai nhận, cập nhật trong ${MAX_AGE_DAYS} ngày gần đây. Trước khi chấm điểm, script lọc độ tin cậy của repo để loại các repo "bounty farm" (repo lập ra chỉ để câu lượt attempt): chỉ giữ repo có từ ${MIN_STARS}★ trở lên, được tạo cách đây ít nhất 6 tháng, không phải fork hay repo đã archive, tên repo không chứa bounty/hunter/livefire/airdrop. Lịch sử đã trả thưởng được tra bằng số issue có nhãn \`💰 Rewarded\` của repo (cột Paid before; \`0 ⚠\` nghĩa là chưa thấy bằng chứng repo từng trả tiền). Issue có hơn ${CROWDED_ABOVE} người attempt được tách sang mục Crowded, không xếp hạng. Điểm 0-100: tiền thưởng (tối đa 25, thang log, trần $1000), mức cạnh tranh theo số người đã /attempt hoặc mở PR (tối đa 30), độ tin cậy của repo (tối đa 25: số sao và lịch sử trả thưởng), độ mới (tối đa 10), độ phù hợp với QA automation (tối đa 10: ngôn ngữ TypeScript/JavaScript/Go/Python và từ khóa test, Playwright, e2e, CI, flaky, lint, cli), trừ điểm nếu chưa rõ số tiền, mô tả quá dài hoặc chưa rõ quy định AI. Issue đã được trả thưởng và repo cấm nội dung do AI tạo ra đã bị loại.`,
    '',
    '> Lưu ý: bounty rất cạnh tranh, số tiền và số lượt attempt có thể đã đổi từ lúc tạo trang. Hãy đọc kỹ CONTRIBUTING và luật của repo trước khi làm, luôn khai báo (disclose) khi có AI hỗ trợ, và đừng spam `/attempt`. Bộ lọc chỉ giảm rủi ro, không thay thế việc tự kiểm tra repo và người ra bounty. Mục AI: `disclose` nghĩa là repo yêu cầu khai báo, `unknown` nghĩa là chưa tìm thấy quy định rõ ràng. Mục Paid before: `Upwork` nghĩa là repo trả qua Upwork (không có nhãn để đếm), `?` nghĩa là chưa tra được.',
    '',
    `## Top ${TOP_TABLE}`,
    '',
    kept.length ? `${HEAD}\n${kept.slice(0, TOP_TABLE).map(row).join('\n')}` : 'Không có bounty phù hợp.',
    '',
    `## Crowded (>${CROWDED_ABOVE} attempts)`,
    '',
    crowded.length
      ? `Quá đông người, không xếp hạng (hiện ${crowded.length} issue, chỉ liệt kê ${Math.min(crowded.length, TOP_CROWDED)} issue tiền cao nhất).\n\n${CROWDED_HEAD}\n${crowded.slice(0, TOP_CROWDED).map(crowdedRow).join('\n')}`
      : 'Không có.',
    '',
    `## Top ${TOP_DETAILS} chi tiết`,
    '',
  ];
  for (const i of kept.slice(0, TOP_DETAILS)) {
    out.push(
      '<details>',
      `<summary><b>${i.score}</b> · ${money(i.amount)} · ${cell(i.repo)}#${i.number}: ${cell(i.title)}</summary>`,
      '',
      `[Mở issue trên GitHub](${i.url})`,
      '',
      i.excerpt ? `\`\`\`text\n${i.excerpt.replace(/`{3,}/g, "''")}\n\`\`\`` : '_(không có mô tả)_',
      '',
      '</details>',
      '',
    );
  }
  return `${out.join('\n')}\n`;
}

function write(result, date) {
  mkdirSync(dirname(JSON_OUT), { recursive: true });
  const items = result.kept.map(({ body, bodyLength, topics, ...i }) => i);
  writeFileSync(JSON_OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), items, crowded: result.crowded }, null, 2)}\n`);
  mkdirSync(dirname(MD_OUT), { recursive: true });
  writeFileSync(MD_OUT, markdown(result, date));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const top = result.kept.slice(0, TOP_DETAILS);
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Bounty scout: top ${TOP_DETAILS}\n\n${top.length ? `${HEAD}\n${top.map(row).join('\n')}` : 'Không có bounty phù hợp.'}\n`,
    );
  }
  console.log('bounties: wrote reports/bounties.json and docs/oss/bounties.md');
}

async function main() {
  const { items, ok } = await searchAll();
  if (!ok) return console.warn('bounties: GitHub search unreachable, keeping the existing files');
  write(await collect(items), new Date().toISOString().slice(0, 10));
}

try {
  await main();
} catch (err) {
  console.warn(`bounties: ${err?.message ?? err}`);
}
process.exit(0);
