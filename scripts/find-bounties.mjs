// Bounty scout: finds PAID open-source issues (Algora-style "💎 Bounty" labels and similar) that suit a
// QA automation engineer, ranks them and writes reports/bounties.json + docs/oss/bounties.md (+ job summary).
// Best effort: it never fails the build (always exits 0). GitHub's global issue search is only reachable
// from CI, so BOUNTY_FIXTURE=<dir> replaces the network for testing. The dir holds:
//   search.json        array of GitHub search items (each with repository_url)
//   repos.json         map "owner/repo" -> { stargazers_count, language, archived, topics }
//   comments.json      map issue html_url -> array of comments ({ user: { login, type }, body })
//   contributing.json  map "owner/repo" -> CONTRIBUTING.md text
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = join(ROOT, 'reports', 'bounties.json');
const MD_OUT = join(ROOT, 'docs', 'oss', 'bounties.md');
const FIXTURE = process.env.BOUNTY_FIXTURE ? resolve(process.env.BOUNTY_FIXTURE) : null;

const DAY = 86_400_000;
const MAX_AGE_DAYS = 120;
const MAX_REPOS = 40; // repos we fetch info for
const MAX_DETAIL = 40; // issues we fetch comments for (and keep)
const TOP_TABLE = 25;
const TOP_DETAILS = 10;
const SEARCH_GAP_MS = 2500; // search API: 30 req/min authenticated
const TIMEOUT_MS = 15_000;
const DEADLINE_MS = 6 * 60_000; // stop optional calls after this, the job has a 10 minute timeout

const BOUNTY = 'label:"💎 Bounty"';
const QUERIES = [
  `${BOUNTY} language:TypeScript`,
  `${BOUNTY} language:JavaScript`,
  `${BOUNTY} language:Go`,
  `${BOUNTY} language:Python`,
  `${BOUNTY} playwright`,
  `${BOUNTY} test in:title,body`,
  'label:bounty language:TypeScript',
  'label:bounty language:Go',
  'label:"bounty" playwright',
].map((q) => `${q} is:issue is:open`);

const FIT_LANGS = new Set(['TypeScript', 'JavaScript', 'Go', 'Python']);
const FIT_WORDS = /\b(?:test|tests|testing|playwright|e2e|ci|flaky|lint|linting|typescript|cli)\b/i;

// Score 0-100 (higher = better bounty for a QA automation engineer):
//   amount       0..35  35 * log10(1 + usd) / log10(1001), i.e. $1000 and above -> 35 ($100 ~ 23, $10 ~ 12); unknown -> 0
//   competition  0..25  attempts 0 -> 25, 1 -> 18, 2-3 -> 10, 4+ -> 0 (unknown comments -> 10)
//   freshness    0..15  15 * (1 - ageDays / 120) by updatedAt, floored at 0
//   fit          0..20  +10 repo language is TypeScript/JavaScript/Go/Python,
//                       +10 title/body/topics match test|playwright|e2e|ci|flaky|lint|typescript|cli
//   penalties           -10 body longer than 6000 chars (hard to scope), -10 amount unknown
//   (clamped to 0..100; the best possible item scores 95)
function score(i, now = Date.now()) {
  const amount = i.amount == null ? 0 : Math.min(35, (35 * Math.log10(1 + i.amount)) / Math.log10(1001));
  const a = i.attempts;
  const compete = a == null ? 10 : a === 0 ? 25 : a === 1 ? 18 : a <= 3 ? 10 : 0;
  const age = Math.max(0, (now - Date.parse(i.updatedAt)) / DAY);
  const fresh = 15 * Math.max(0, 1 - age / MAX_AGE_DAYS);
  const fit = (FIT_LANGS.has(i.language) ? 10 : 0) + (FIT_WORDS.test(`${i.title}\n${i.body}\n${i.topics.join(' ')}`) ? 10 : 0);
  const penalty = (i.bodyLength > 6000 ? 10 : 0) + (i.amount == null ? 10 : 0);
  return Math.round(Math.min(100, Math.max(0, amount + compete + fresh + fit - penalty)));
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

// Bounty amount: largest in a bounty-bot comment, else largest in the labels, else largest in the body
// (body amounts only count next to a bounty/reward/paid word, to ignore "$1" in shell snippets).
function findAmount(labels, body, comments) {
  const bot = comments.filter((c) => isBot(c) && /bounty|💎|reward/i.test(c.body ?? ''));
  const fromBots = largest(bot.flatMap((c) => amountsIn(c.body).map((a) => a.n)));
  if (fromBots != null) return fromBots;
  const fromLabels = largest(labels.flatMap((l) => amountsIn(l).map((a) => a.n)));
  if (fromLabels != null) return fromLabels;
  const text = stripBody(body);
  return largest(
    amountsIn(text)
      .filter((a) => /bounty|reward|prize|paid|payout|💎|💰/i.test(text.slice(Math.max(0, a.index - 80), a.index + a.len + 80)))
      .map((a) => a.n),
  );
}

const ATTEMPT = /\/attempt\b|\b(?:i'?d like to work on|i would like to work on|can i work on|could i work on|assign (?:it |this )?(?:to )?me)\b/i;
const OPENED_PR = /\/claim\b|(?:\bPRs?\b|pull request)[^\n]{0,80}#\d+|#\d+[^\n]{0,80}(?:\bPRs?\b|pull request)/i;
const REWARDED_LABEL = /rewarded|\bpaid\b|\bclaimed\b/i;
const REWARDED_BOT =
  /\b(?:has|have) been (?:awarded|rewarded|paid)\b|\bbounty (?:has been |was |is )?(?:claimed|awarded|rewarded|paid)\b|🎉[^\n]*\b(?:awarded|rewarded)\b|\b(?:awarded|rewarded)\b[^\n]*\$\s?\d/i;

// Attempts = distinct human users with an attempt phrase, a /claim, or a mention of a PR they opened.
function findAttempts(comments) {
  const users = new Set();
  for (const c of comments) {
    if (isBot(c)) continue;
    const body = c.body ?? '';
    if (ATTEMPT.test(body) || OPENED_PR.test(body)) users.add(c.user?.login ?? `anon-${users.size}`);
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
const fixture = (name) => JSON.parse(readFileSync(join(FIXTURE, name), 'utf8'));

const headers = (accept = 'application/vnd.github+json') => {
  const h = { accept, 'user-agent': 'qa-agent-portfolio' };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
};

// GET against the GitHub API; returns { status, body } (body = parsed JSON, or text when raw). One retry
// when the API asks to wait a few seconds. Throws on network errors.
async function gh(path, { raw = false } = {}) {
  for (let attempt = 0; ; attempt++) {
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
  for (const [n, q] of QUERIES.entries()) {
    if (n) await sleep(SEARCH_GAP_MS);
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
  for (const file of ['CONTRIBUTING.md', '.github/CONTRIBUTING.md']) {
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

// Cheap pre-score used to decide which issues deserve API calls: freshness (0..15) + bounty label (+10 / +5).
function preScore(item, now) {
  const labels = (item.labels ?? []).map((l) => l.name ?? '');
  const age = Math.max(0, (now - Date.parse(item.updated_at)) / DAY);
  return 15 * Math.max(0, 1 - age / MAX_AGE_DAYS) + (labels.some((l) => /💎/.test(l)) ? 10 : labels.some((l) => /bounty/i.test(l)) ? 5 : 0);
}

async function collect(rawItems) {
  const now = Date.now();
  const since = now - MAX_AGE_DAYS * DAY;
  const seen = new Set();
  const candidates = [];
  for (const item of rawItems) {
    const repo = repoOf(item);
    if (!repo || !item.html_url?.startsWith('https://github.com/') || seen.has(item.html_url)) continue;
    seen.add(item.html_url);
    if (item.pull_request || item.assignee || item.assignees?.length) continue;
    if (!(Date.parse(item.updated_at) >= since)) continue;
    candidates.push({ item, repo, pre: preScore(item, now) });
  }
  candidates.sort((a, b) => b.pre - a.pre || b.item.updated_at.localeCompare(a.item.updated_at));

  // Repo info, in pre-score order, for at most MAX_REPOS repos; the rest are left out.
  const repos = new Map();
  const usable = [];
  for (const c of candidates) {
    if (!repos.has(c.repo)) {
      if (repos.size >= MAX_REPOS) continue;
      repos.set(c.repo, await repoInfo(c.repo));
    }
    const info = repos.get(c.repo);
    if (info?.archived) continue;
    usable.push({ ...c, info });
  }
  console.log(`bounties: ${rawItems.length} search hits, ${candidates.length} fresh+unassigned, ${repos.size} repos, ${usable.length} usable`);

  const policies = new Map();
  const kept = [];
  let rewarded = 0;
  let forbidden = 0;
  for (const { item, repo, info } of usable.slice(0, MAX_DETAIL)) {
    const labels = (item.labels ?? []).map((l) => l.name ?? '');
    const comments = await commentsFor(item, repo);
    if (isRewarded(labels, comments ?? [])) {
      rewarded++;
      continue;
    }
    if (!policies.has(repo)) policies.set(repo, aiPolicy(await contributingFor(repo)));
    const policy = policies.get(repo);
    if (policy === 'forbidden') {
      forbidden++;
      continue;
    }
    const issue = {
      repo,
      number: item.number,
      title: String(item.title ?? ''),
      url: item.html_url,
      amount: findAmount(labels, item.body, comments ?? []),
      attempts: comments ? findAttempts(comments) : null,
      aiPolicy: policy,
      stars: info?.stargazers_count ?? null,
      language: info?.language ?? null,
      labels,
      updatedAt: item.updated_at,
      excerpt: excerpt(item.body),
      body: stripBody(item.body),
      bodyLength: String(item.body ?? '').length,
      topics: info?.topics ?? [],
    };
    issue.score = score(issue, now);
    kept.push(issue);
  }
  console.log(`bounties: kept ${kept.length}, dropped ${rewarded} rewarded and ${forbidden} AI-forbidden`);
  kept.sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));
  return kept;
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

const HEAD = '| Score | Tiền | Issue | Title | Attempts | Language | AI | Updated |\n|---:|---:|---|---|---:|---|---|---|';
const row = (i) =>
  `| ${i.score} | ${money(i.amount)} | [${cell(i.repo)}#${i.number}](${i.url}) | ${cell(i.title)} | ${i.attempts ?? '?'} | ${cell(i.language ?? '-')} | ${i.aiPolicy} | ${day(i.updatedAt)} |`;

function markdown(all, date) {
  const out = [
    '---',
    'title: Paid OSS bounties',
    'short: Bounties',
    'icon: git',
    '---',
    '',
    '# Paid OSS bounties',
    '',
    `Trang này được tạo tự động bởi workflow oss-scout (\`scripts/find-bounties.mjs\`) vào ${date}. Script tìm các issue đang mở có nhãn bounty (ví dụ \`💎 Bounty\` của Algora), chưa ai nhận, cập nhật trong ${MAX_AGE_DAYS} ngày gần đây, rồi chấm điểm 0-100: tiền thưởng (tối đa 35, thang log), mức cạnh tranh theo số người đã /attempt hoặc mở PR (tối đa 25), độ mới (tối đa 15) và độ phù hợp với QA automation (ngôn ngữ TypeScript/JavaScript/Go/Python và từ khóa test, Playwright, e2e, CI, flaky, lint, cli: tối đa 20), trừ điểm nếu mô tả quá dài hoặc chưa rõ số tiền. Issue đã được trả thưởng và repo cấm nội dung do AI tạo ra đã bị loại.`,
    '',
    '> Lưu ý: bounty rất cạnh tranh, số tiền và số lượt attempt có thể đã đổi từ lúc tạo trang. Hãy đọc kỹ CONTRIBUTING và luật của repo trước khi làm, luôn khai báo (disclose) khi có AI hỗ trợ, và đừng spam `/attempt`. Mục AI: `disclose` nghĩa là repo yêu cầu khai báo, `unknown` nghĩa là chưa tìm thấy quy định rõ ràng.',
    '',
    '## Top 25',
    '',
    all.length ? `${HEAD}\n${all.slice(0, TOP_TABLE).map(row).join('\n')}` : 'Không có bounty phù hợp.',
    '',
    '## Top 10 chi tiết',
    '',
  ];
  for (const i of all.slice(0, TOP_DETAILS)) {
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

function write(all, date) {
  mkdirSync(dirname(JSON_OUT), { recursive: true });
  const items = all.map(({ body, bodyLength, topics, ...i }) => i);
  writeFileSync(JSON_OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2)}\n`);
  mkdirSync(dirname(MD_OUT), { recursive: true });
  writeFileSync(MD_OUT, markdown(all, date));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const top = all.slice(0, TOP_DETAILS);
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
  const all = await collect(items);
  write(all, new Date().toISOString().slice(0, 10));
}

try {
  await main();
} catch (err) {
  console.warn(`bounties: ${err?.message ?? err}`);
}
process.exit(0);
