// Builds the static site: site/ -> dist/, renders docs/lessons/*.md with `marked`,
// fills the {{placeholders}} in index.html, cv.html and case-study.html (tests, lessons, report stats, OSS contributions + issues).
// Never needs the network; every optional input (docs, report, config) may be missing.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => join(ROOT, ...p);

const SLUG_RE = /^[\w.-]+\/[\w.-]+$/;
const REPO_SLUG = SLUG_RE.test(process.env.GITHUB_REPOSITORY ?? '')
  ? process.env.GITHUB_REPOSITORY
  : 'nguyenvanlinh14/qa-agent-portfolio';
const REPO_URL = `https://github.com/${REPO_SLUG}`;

// Same list as scripts/find-good-first-issues.mjs (used for the "no data yet" chips).
const OSS_REPOS = [
  { repo: 'microsoft/playwright', label: 'open-to-a-pull-request' },
  { repo: 'microsoft/playwright-mcp', label: 'good first issue' },
  { repo: 'grafana/k6', label: 'good first issue' },
  { repo: 'grafana/k6-docs', label: 'good first issue' },
  { repo: 'allure-framework/allure-js', label: 'good first issue' },
  { repo: 'testing-library/dom-testing-library', label: 'good first issue' },
  { repo: 'microsoft/playwright-vscode', label: 'open-to-a-pull-request' },
];
const ICONS = new Set(['agent', 'mcp', 'rules', 'ci', 'pom', 'api', 'eye', 'data', 'gauge', 'docker', 'pipeline', 'puzzle', 'book', 'git']);

// Also neutralises `{` so interpolated data can never look like a {{placeholder}}.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\{/g, '&#123;');

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function slugify(text) {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { meta, body: raw.slice(m[0].length) };
}

function renderMarkdown(body) {
  const used = new Set();
  const md = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        let id = slugify(text);
        for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
        used.add(id);
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      // GFM task-list boxes are read-only marks; give them a name so screen readers do not announce an unlabeled field.
      checkbox({ checked }) {
        return `<input type="checkbox" disabled${checked ? ' checked' : ''} aria-label="${checked ? 'Done' : 'To do'}"> `;
      },
      code({ text, lang }) {
        if (lang === 'mermaid') return `<pre class="mermaid">${esc(text)}</pre>\n`;
        const cls = lang ? ` class="language-${esc(lang.split(/\s+/)[0])}"` : '';
        // tabindex: a scrolling code block must be reachable with the keyboard (axe: scrollable-region-focusable).
        return `<pre tabindex="0"><code${cls}>${esc(text)}</code></pre>\n`;
      },
    },
  });
  return md.parse(body);
}

const THEME_BOOT = `<script>
    // Apply the saved theme before first paint (no flash). Storage may be blocked: ignore.
    // The Playwright report on this origin owns localStorage 'theme' (dark-mode | light-mode | system);
    // keep ours under a separate key and move old 'dark' / 'light' values off it.
    try {
      const s = localStorage, legacy = s.getItem('theme');
      if (legacy === 'dark' || legacy === 'light') { s.removeItem('theme'); if (!s.getItem('linhqa-theme')) s.setItem('linhqa-theme', legacy); }
      const t = s.getItem('linhqa-theme'); if (t) document.documentElement.dataset.theme = t;
    } catch {}
  </script>`;

const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%237c5cff'/><path d='M9 17l5 5 9-11' stroke='white' stroke-width='3.5' fill='none' stroke-linecap='round'/></svg>" />`;

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></symbol>
  </defs></svg>`;

const TOGGLE_JS = `<script>
    document.querySelector('.theme-toggle').addEventListener('click', () => {
      const root = document.documentElement;
      const dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('linhqa-theme', root.dataset.theme); } catch {}
    });
  </script>`;

// Diagrams in lessons are drawn client-side only on pages that contain one.
const MERMAID_JS = `<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
    const dark = (document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';
    mermaid.initialize({ startOnLoad: true, theme: dark ? 'dark' : 'default' });
  </script>`;

function pageShell({ title, description, content, depth = 1 }) {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} · Linh.QA</title>
  <meta name="description" content="${esc(description ?? title)}" />
  ${THEME_BOOT}
  <link rel="stylesheet" href="${up}assets/style.css" />
  ${FAVICON}
</head>
<body>
  ${SPRITE}
  <nav class="nav" aria-label="Main">
    <div class="wrap">
      <a class="brand" href="${up}">Linh<span>.</span>QA</a>
      <ul>
        <li><a href="${up}#lessons">Lessons</a></li>
        <li><a href="${up}report/">Report</a></li>
        <li><a href="${esc(REPO_URL)}">GitHub</a></li>
      </ul>
      <button class="theme-toggle" type="button" data-testid="theme-toggle" aria-label="Toggle dark / light theme">
        <svg class="ic sun"><use href="#i-sun" /></svg><svg class="ic moon"><use href="#i-moon" /></svg>
      </button>
    </div>
  </nav>
${content}
  ${TOGGLE_JS}
  ${content.includes('class="mermaid"') ? MERMAID_JS : ''}
</body>
</html>
`;
}

function readDoc(file, fallbackTitle) {
  const { meta, body } = parseFrontmatter(readFileSync(file, 'utf8'));
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = meta.title || h1 || fallbackTitle;
  return { title, short: meta.short || title, icon: ICONS.has(meta.icon) ? meta.icon : 'book', body };
}

function lessonPage(doc, prev, next) {
  const link = (cls, rel, l, label) =>
    l
      ? `<a class="${cls}" rel="${rel}" href="${esc(l.slug)}.html">${label(esc(l.title))}</a>`
      : '<span></span>';
  const content = `  <main>
    <div class="wrap">
      <article class="doc" data-testid="lesson-content">
${renderMarkdown(doc.body)}
      </article>
      <nav class="lesson-nav" aria-label="Lesson navigation">
        ${link('prev', 'prev', prev, (t) => `← ${t}`)}
        ${link('next', 'next', next, (t) => `${t} →`)}
      </nav>
    </div>
  </main>`;
  return pageShell({ title: doc.title, content });
}

// --- inputs ------------------------------------------------------------------------

function loadLessons() {
  const dir = at('docs', 'lessons');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f, i) => {
      const slug = f.replace(/\.md$/, '');
      const num = slug.match(/^(\d+)/)?.[1] ?? String(i + 1);
      return { slug, num: num.padStart(2, '0'), ...readDoc(join(dir, f), slug) };
    });
}

function readOssIssues(buf) {
  try {
    const data = JSON.parse(buf);
    return Array.isArray(data.issues) ? data.issues : [];
  } catch {
    return [];
  }
}

function ossChips(issues) {
  const valid = issues.filter((i) => i && /^https:\/\//.test(i.url ?? '') && i.title).slice(0, 12);
  if (valid.length) {
    return valid
      .map((i) => {
        const repo = String(i.repo ?? '').split('/').pop();
        const title = truncate(`#${i.number} ${i.title}`, 48);
        return `<a class="chip" href="${esc(i.url)}" data-testid="oss-chip"><span class="chip-repo">${esc(repo)}</span><span class="chip-title">${esc(title)}</span></a>`;
      })
      .join('\n          ');
  }
  return OSS_REPOS.map(({ repo, label }) => {
    const q = encodeURIComponent(`is:open is:issue label:"${label}"`);
    return `<a class="chip" href="https://github.com/${repo}/issues?q=${q}" data-testid="oss-chip"><span class="chip-repo">${esc(repo.split('/')[1])}</span><span class="chip-title">${esc(label)}</span></a>`;
  }).join('\n          ');
}

// Contributions: docs/oss/contributions.json -> one card per entry with a 4-step progress track.
const CONTRIB_STAGES = ['proposed', 'pr', 'review', 'merged'];
const CONTRIB_STEPS = ['Comment', 'PR', 'Review', 'Merged'];
const CONTRIB_ICONS = { fix: 'wrench', ci: 'pipeline', docs: 'book', feature: 'puzzle' };
const isHttps = (u) => typeof u === 'string' && /^https:\/\//.test(u);

function readContributions() {
  try {
    const file = at('docs', 'oss', 'contributions.json');
    if (!existsSync(file)) return [];
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function contributionCards(entries) {
  return entries
    .filter((c) => c && SLUG_RE.test(c.repo ?? '') && Number.isInteger(c.issue) && c.issue > 0 && c.title)
    .slice(0, 12)
    .map((c) => {
      const stage = CONTRIB_STAGES.includes(c.stage) ? c.stage : 'proposed';
      const at_ = CONTRIB_STAGES.indexOf(stage);
      const icon = CONTRIB_ICONS[c.kind] ?? 'git';
      const steps = CONTRIB_STEPS.map((label, i) => {
        const state = i < at_ || stage === 'merged' ? 'done' : i === at_ ? 'current' : 'todo';
        return `<li class="${state}"${state === 'current' ? ' aria-current="step"' : ''}><span>${esc(label)}</span></li>`;
      }).join('');
      const links = c.links ?? {};
      const pill = (label, url) =>
        isHttps(url) ? `<a class="pill-link" href="${esc(url)}" rel="noopener">${label}<svg class="ic" aria-hidden="true"><use href="#i-arrow" /></svg></a>` : '';
      const pills = [pill('Issue', links.issue), pill('Draft', links.draft), pill('Run', links.evidence), pill('PR', links.pr)].filter(Boolean).join('');
      const ref = `${c.repo}#${c.issue}`;
      return `<article class="contrib" data-testid="contribution" data-stage="${esc(stage)}">
            <div class="c-head"><svg class="big" aria-hidden="true"><use href="#i-${icon}" /></svg><div class="c-id"><b>${esc(ref)}</b><small>${esc(truncate(String(c.title), 80))}</small></div></div>
            <ol class="track" aria-label="${esc(ref)} progress">${steps}</ol>
            <div class="c-links">${pills}</div>
          </article>`;
    })
    .join('\n          ');
}

function countTests() {
  // Preferred: Playwright's own listing (setup project excluded). Fallback: regex over the specs.
  // --reporter=list keeps the json/junit reporters from overwriting reports/ with an empty listing.
  try {
    if (!['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'].some((f) => existsSync(at(f)))) throw new Error('no config');
    const out = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=list'], { cwd: ROOT, encoding: 'utf8', timeout: 90_000, stdio: ['ignore', 'pipe', 'ignore'] });
    const total = Number(out.match(/Total:\s*(\d+)\s+tests?/)?.[1]);
    if (!Number.isFinite(total)) throw new Error('no total');
    const titles = [];
    let setup = 0;
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^\s*\[([^\]]+)\]\s*›\s*(.*)$/);
      if (!m) continue;
      if (m[1] === 'setup') {
        setup++;
        continue;
      }
      const parts = m[2].split(' › ');
      titles.push(`[${m[1]}] ${parts.slice(1).join(' › ') || parts[0]}`);
    }
    return { count: Math.max(0, total - setup), titles };
  } catch {
    return countTestsByRegex();
  }
}

function countTestsByRegex() {
  const titles = [];
  const walk = (dir, project) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, project);
      else if (/\.spec\.[cm]?[jt]s$/.test(e.name)) {
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/\btest(?:\.\w+)?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) titles.push(`[${project}] ${m[2]}`);
      }
    }
  };
  for (const e of existsSync(at('tests')) ? readdirSync(at('tests'), { withFileTypes: true }) : []) {
    if (e.isDirectory() && e.name !== 'setup') walk(at('tests', e.name), e.name);
  }
  return { count: titles.length, titles };
}

function readReport() {
  const file = at('reports', 'results.json');
  if (!existsSync(file)) return null;
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    const tests = [];
    const walk = (suite) => {
      for (const spec of suite.specs ?? []) {
        for (const t of spec.tests ?? []) {
          if (t.projectName === 'setup') continue;
          const last = t.results?.[t.results.length - 1];
          tests.push({ project: t.projectName, title: spec.title, status: t.status, ms: last?.duration ?? 0 });
        }
      }
      (suite.suites ?? []).forEach(walk);
    };
    (json.suites ?? []).forEach(walk);
    return tests;
  } catch {
    return null;
  }
}

const fmtMs = (ms) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

function reportParts(listed) {
  const tests = readReport();
  if (!tests) {
    const rows = listed.titles.slice(0, 6).map((t) => `<div class="mr-row skip"><i></i><span>${esc(t)}</span><em>—</em></div>`);
    return { passed: '—', failed: '—', flaky: '—', rows: rows.join('\n              ') };
  }
  const cls = { expected: 'ok', unexpected: 'bad', flaky: 'flaky', skipped: 'skip' };
  const order = ['bad', 'flaky', 'ok', 'skip'];
  const mapped = tests.map((t) => ({ ...t, cls: cls[t.status] ?? 'skip' }));
  const count = (c) => mapped.filter((t) => t.cls === c).length;
  const rows = mapped
    .sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls))
    .slice(0, 6)
    .map((t) => `<div class="mr-row ${t.cls}"><i></i><span>${esc(`[${t.project}] ${t.title}`)}</span><em>${fmtMs(t.ms)}</em></div>`);
  return { passed: count('ok'), failed: count('bad'), flaky: count('flaky'), rows: rows.join('\n              ') };
}

function buildInfo() {
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  const branch = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');
  const sha = (process.env.GITHUB_SHA || git('rev-parse', 'HEAD')).slice(0, 7);
  if (!branch || !sha) return 'local build';
  return `${branch} · ${sha} · ${new Date().toISOString().slice(0, 10)}`;
}

// --- build -------------------------------------------------------------------------

const DIST = at('dist');
const ossFile = join(DIST, 'data', 'oss-issues.json');
const savedOss = existsSync(ossFile) ? readFileSync(ossFile) : null;

rmSync(DIST, { recursive: true, force: true });
cpSync(at('site'), DIST, { recursive: true });
if (savedOss) {
  mkdirSync(dirname(ossFile), { recursive: true });
  writeFileSync(ossFile, savedOss);
}

const lessons = loadLessons();
mkdirSync(join(DIST, 'lessons'), { recursive: true });
lessons.forEach((l, i) => writeFileSync(join(DIST, 'lessons', `${l.slug}.html`), lessonPage(l, lessons[i - 1], lessons[i + 1])));

const playbookSrc = at('docs', 'open-source-playbook.md');
if (existsSync(playbookSrc)) {
  const doc = readDoc(playbookSrc, 'Open-source playbook');
  const last = lessons[lessons.length - 1];
  writeFileSync(join(DIST, 'lessons', 'open-source-playbook.html'), lessonPage(doc, last, undefined));
}

// Generated by the oss-scout workflow; rendered like the playbook (not a lesson, not in the grid).
const candidatesSrc = at('docs', 'oss', 'candidates.md');
if (existsSync(candidatesSrc)) {
  writeFileSync(join(DIST, 'lessons', 'oss-candidates.html'), lessonPage(readDoc(candidatesSrc, 'OSS candidates'), undefined, undefined));
}

const bountiesSrc = at('docs', 'oss', 'bounties.md');
if (existsSync(bountiesSrc)) {
  writeFileSync(join(DIST, 'lessons', 'oss-bounties.html'), lessonPage(readDoc(bountiesSrc, 'Paid OSS bounties'), undefined, undefined));
}

// Report: copy the Playwright HTML report, or leave a small placeholder page.
if (existsSync(at('playwright-report', 'index.html'))) {
  cpSync(at('playwright-report'), join(DIST, 'report'), { recursive: true });
} else {
  mkdirSync(join(DIST, 'report'), { recursive: true });
  const content = `  <main>
    <div class="wrap">
      <article class="doc">
        <h1>Test report</h1>
        <p>Report is published by CI on every push to <code>main</code>.</p>
        <p><a href="${esc(REPO_URL)}/actions">See the latest runs on GitHub Actions</a> or <a href="../">go back home</a>.</p>
      </article>
    </div>
  </main>`;
  writeFileSync(join(DIST, 'report', 'index.html'), pageShell({ title: 'Test report', content, depth: 1 }).replace('lang="vi"', 'lang="en"'));
}

// Live run: the CI run's timeline (reporters/live-reporter.ts) is replayed by dist/live/; without it, sample-run.jsonl.
if (existsSync(at('reports', 'live-events.jsonl'))) cpSync(at('reports', 'live-events.jsonl'), join(DIST, 'live', 'latest-run.jsonl'));
// …and the screenshot the `page` fixture took after each UI test, shown in the dashboard's browser view.
if (existsSync(at('reports', 'live-frames'))) cpSync(at('reports', 'live-frames'), join(DIST, 'live', 'frames'), { recursive: true });

// k6: the web dashboard exported at the end of each run (K6_WEB_DASHBOARD_EXPORT) is the same view as the live one.
mkdirSync(join(DIST, 'perf'), { recursive: true });
const k6Dashboards = existsSync(at('reports')) ? readdirSync(at('reports')).filter((f) => /^k6-[\w-]+-dashboard\.html$/.test(f)).sort() : [];
for (const f of k6Dashboards) cpSync(at('reports', f), join(DIST, 'perf', f));
const perfContent = `  <main>
    <div class="wrap">
      <article class="doc">
        <h1>k6 dashboards</h1>
        <p>k6 shows this dashboard live while a test runs (<code>npm run k6:live</code>, http://127.0.0.1:5665) and exports the same view
        as one HTML file at the end. CI exports the smoke run on every push to <code>main</code>.</p>
        ${k6Dashboards.length
          ? `<ul data-testid="k6-dashboards">${k6Dashboards.map((f) => `<li><a href="${esc(f)}">${esc(f.replace(/^k6-|-dashboard\.html$/g, ''))}</a></li>`).join('')}</ul>`
          : `<p data-testid="k6-dashboards-empty">No dashboard yet: it is published by the next CI run on <code>main</code>.</p>`}
      </article>
    </div>
  </main>`;
writeFileSync(join(DIST, 'perf', 'index.html'), pageShell({ title: 'k6 dashboards', content: perfContent, depth: 1 }).replace('lang="vi"', 'lang="en"'));

const listed = countTests();
const report = reportParts(listed);
const values = {
  REPO_URL: esc(REPO_URL),
  REPO_SLUG: esc(REPO_SLUG),
  TEST_COUNT: listed.count,
  LESSON_COUNT: lessons.length,
  BUILD_INFO: esc(buildInfo()),
  LESSONS: lessons
    .map((l) => `<a class="lesson" href="lessons/${esc(l.slug)}.html" data-testid="lesson-card"><span class="num">${esc(l.num)}</span><svg class="big" aria-hidden="true"><use href="#i-${esc(l.icon)}"/></svg><b>${esc(l.short)}</b></a>`)
    .join('\n          '),
  OSS_CONTRIBUTIONS: contributionCards(readContributions()),
  OSS_ISSUES: ossChips(savedOss ? readOssIssues(savedOss) : []),
  REPORT_PASSED: report.passed,
  REPORT_FAILED: report.failed,
  REPORT_FLAKY: report.flaky,
  REPORT_ROWS: report.rows,
};

// index.html, cv.html and case-study.html share the same {{placeholders}}; any left over fails the build.
for (const name of ['index.html', 'cv.html', 'case-study.html']) {
  const file = join(DIST, name);
  if (name !== 'index.html' && !existsSync(file)) continue;
  const html = readFileSync(file, 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? String(values[k]) : m));
  writeFileSync(file, html);

  const left = html.match(/\{\{[^}]*\}\}/g);
  if (left) {
    console.error(`build-site: unfilled placeholders in dist/${name}: ${[...new Set(left)].join(', ')}`);
    process.exit(1);
  }
}

const stats = readReport() ? 'report stats from reports/results.json' : 'no results.json';
console.log(`build-site: ${lessons.length} lessons, ${listed.count} tests, ${stats}, ${existsSync(playbookSrc) ? 'playbook' : 'no playbook'} -> dist/`);
