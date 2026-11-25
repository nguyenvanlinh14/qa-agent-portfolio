// Live test-run dashboard.
//   ?live=1           connect to the reporter's /events stream (npm run test:live)
//   ?src=<file.jsonl> replay a recorded run (default: latest-run.jsonl from CI, else sample-run.jsonl)
//   ?speed=1|4|16|max replay speed (max = jump to the final state)
//   ?site=<url>       site root the browser view's address points to (default: this site)
const $ = (id) => document.querySelector(`[data-testid="${id}"]`);
const q = new URLSearchParams(location.search);

let s;
let shownFrame = ''; // frame currently in the browser view, so it is only swapped when a new one arrives
function reset() {
  shownFrame = '';
  s = {
    total: 0, workers: 0, projects: [], startedAt: '', t: 0, ended: null,
    running: new Map(), // id -> { title, project, worker, step, start }
    finals: new Map(), // test key (id without retry) -> { outcome, project, title }
    lastFrame: null, // { frame, url, title, outcome } of the last UI test that left a screenshot
    finished: [], failures: [], perSecond: [],
  };
}
reset();

const key = (id) => id.replace(/#\d+$/, '');
const fmt = (ms) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1000)} s`);
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function apply(e) {
  s.t = Math.max(s.t, e.t);
  if (e.type === 'begin') Object.assign(s, { total: e.total, workers: e.workers, projects: e.projects, startedAt: e.startedAt });
  if (e.type === 'testBegin') s.running.set(e.id, { title: e.title, project: e.project, worker: e.worker, step: '', start: e.t, retry: e.retry });
  if (e.type === 'step') { const r = s.running.get(e.id); if (r) r.step = e.title; }
  if (e.type === 'testEnd') {
    const r = s.running.get(e.id);
    s.running.delete(e.id);
    const info = { outcome: e.outcome, project: r?.project ?? '', title: r?.title ?? e.id };
    s.finals.set(key(e.id), info);
    s.finished.unshift({ ...info, duration: e.duration, retry: e.retry });
    if (e.frame) s.lastFrame = { frame: e.frame, url: e.url, title: info.title, outcome: e.outcome };
    if (e.status === 'failed' || e.status === 'timedOut') s.failures.unshift({ title: info.title, project: info.project, retry: e.retry, error: e.error ?? e.status });
    const sec = Math.floor(e.t / 1000);
    s.perSecond[sec] = (s.perSecond[sec] ?? 0) + 1;
  }
  if (e.type === 'end') s.ended = e;
}

function counts() {
  const c = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  for (const f of s.finals.values()) c[f.outcome] = (c[f.outcome] ?? 0) + 1;
  return c;
}

function render() {
  const c = counts();
  const done = s.finals.size;
  $('count-passed').textContent = c.expected;
  $('count-failed').textContent = c.unexpected;
  $('count-flaky').textContent = c.flaky;
  $('count-skipped').textContent = c.skipped;
  $('count-running').textContent = s.running.size;
  $('live-done').textContent = done;
  $('live-total').textContent = s.total;
  $('live-elapsed').textContent = fmt(s.ended ? s.ended.duration : s.t);
  $('live-eta').textContent = !s.ended && done > 0 && s.total > done ? `· about ${fmt((s.t / done) * (s.total - done))} left` : '';

  const bar = $('live-progress');
  bar.setAttribute('aria-valuemax', String(s.total));
  bar.setAttribute('aria-valuenow', String(done));
  const pct = (n) => `${s.total ? (n / s.total) * 100 : 0}%`;
  bar.querySelector('.pass').style.width = pct(c.expected);
  bar.querySelector('.flaky').style.width = pct(c.flaky);
  bar.querySelector('.fail').style.width = pct(c.unexpected);
  bar.querySelector('.skip').style.width = pct(c.skipped);

  const byWorker = new Map([...s.running.values()].map((r) => [r.worker, r]));
  const slots = Math.max(s.workers, ...[...byWorker.keys()].map((w) => w + 1), 1);
  $('workers').innerHTML = Array.from({ length: slots }, (_, w) => {
    const r = byWorker.get(w);
    return r
      ? `<li><span class="w">worker ${w}</span><span class="t" title="${esc(r.title)}">${esc(r.title)}<small>${esc(r.project)}${r.retry ? ` · retry ${r.retry}` : ''}${r.step ? ` · ${esc(r.step)}` : ''}</small></span><span class="s">${fmt(Math.max(0, s.t - r.start))}</span></li>`
      : `<li class="idle"><span class="w">worker ${w}</span><span class="t">${s.ended ? 'done' : 'idle'}</span><span class="s"></span></li>`;
  }).join('');

  const rows = new Map(s.projects.map((p) => [p, { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }]));
  for (const f of s.finals.values()) {
    if (!rows.has(f.project)) rows.set(f.project, { expected: 0, unexpected: 0, flaky: 0, skipped: 0 });
    rows.get(f.project)[f.outcome]++;
  }
  $('projects').tBodies[0].innerHTML = [...rows]
    .map(([p, r]) => `<tr data-project="${esc(p)}"><td>${esc(p)}</td><td>${r.expected}</td><td>${r.unexpected}</td><td>${r.flaky}</td><td>${r.skipped}</td></tr>`)
    .join('');

  $('failures').innerHTML = s.failures
    .map((f) => `<li><b>${esc(f.title)}</b> <small>${esc(f.project)}${f.retry ? ` · retry ${f.retry}` : ''}</small><code>${esc(f.error)}</code></li>`)
    .join('');
  $('no-failures').hidden = s.failures.length > 0;

  $('finished').innerHTML = s.finished
    .slice(0, 200)
    .map((f) => `<li><span class="dot ${esc(f.outcome)}" title="${esc(f.outcome)}"></span><span class="t" title="${esc(f.title)}">${esc(f.title)}</span><span class="d">${fmt(f.duration)}</span></li>`)
    .join('');

  spark();
  browser();
}

/**
 * Recorded runs point at the CI server (http://localhost:4173/…). On the published site the same path exists under
 * the site root, so the address bar shows (and links to) the real public page; live mode keeps the URL as it is.
 */
function displayUrl(url) {
  if (!url || q.get('live') === '1') return url;
  const u = new URL(url);
  if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return url;
  // ?site=<url> pins the published site root (used when a reel is recorded on a local server).
  const root = q.get('site') ?? new URL('../', location.href).href;
  return new URL(`${u.pathname.replace(/^\//, '')}${u.search}`, root).href;
}

function browser() {
  const f = s.lastFrame;
  const img = $('browser-frame');
  $('browser-empty').hidden = !!f;
  img.hidden = !f;
  if (!f || shownFrame === f.frame) return;
  shownFrame = f.frame;
  img.src = f.frame;
  img.alt = `Screenshot after: ${f.title}`;
  const link = $('browser-url');
  link.textContent = displayUrl(f.url);
  link.href = displayUrl(f.url);
  $('browser-test').textContent = f.title;
  const st = $('browser-status');
  st.hidden = false;
  st.className = `status ${f.outcome}`;
  st.textContent = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' }[f.outcome] ?? f.outcome;
}

function spark() {
  const n = Math.max(s.perSecond.length, Math.ceil(s.t / 1000), 2);
  const vals = Array.from({ length: n }, (_, i) => s.perSecond[i] ?? 0);
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => `${((i / (n - 1)) * 300).toFixed(1)},${(58 - (v / max) * 54).toFixed(1)}`);
  const svg = $('throughput');
  svg.querySelector('.line').setAttribute('d', `M${pts.join(' L')}`);
  svg.querySelector('.area').setAttribute('d', `M0,60 L${pts.join(' L')} L300,60 Z`);
}

function setMode(text, cls) {
  const m = $('live-mode');
  m.textContent = text;
  m.className = `mode ${cls}`;
}

/** Final badge: green only when the run passed. */
function finish(prefix) {
  const status = s.ended?.status ?? 'partial';
  setMode(`${prefix} · ${status}`, status === 'passed' ? 'done' : 'fail');
}

// ---------- live ----------

function live() {
  setMode('live', 'live');
  $('live-source').textContent = 'Streaming from the Playwright reporter (npm run test:live).';
  const es = new EventSource('/events');
  let tick;
  es.onmessage = (m) => {
    const e = JSON.parse(m.data);
    apply(e);
    if (e.type === 'begin') {
      const t0 = Date.now() - e.t;
      tick = setInterval(() => { if (!s.ended) { s.t = Date.now() - t0; render(); } }, 500);
    }
    if (e.type === 'end') {
      clearInterval(tick);
      es.close();
      finish('finished');
    }
    render();
  };
  es.onerror = () => { if (!s.ended) setMode('disconnected', ''); };
}

// ---------- replay ----------

let timer;
async function loadRun() {
  for (const src of [q.get('src'), 'latest-run.jsonl', 'sample-run.jsonl'].filter(Boolean)) {
    const res = await fetch(src, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) continue;
    const events = (await res.text()).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    if (events.length) return { src, events };
  }
  return null;
}

function replay(run) {
  clearInterval(timer);
  reset();
  const speedSel = $('replay-speed');
  const speed = speedSel.value;
  setMode('replay', 'replay');
  const begin = run.events.find((e) => e.type === 'begin');
  const when = begin?.startedAt ? new Date(begin.startedAt).toLocaleString() : 'unknown time';
  const what = run.src === 'latest-run.jsonl' ? 'the latest CI run' : run.src === 'sample-run.jsonl' ? 'a recorded sample run' : `the recorded run ${run.src}`;
  $('live-source').textContent = `Replay of ${what} (${run.events.length} events, started ${when}).`;
  if (speed === 'max') {
    run.events.forEach(apply);
    render();
    finish('replay');
    return;
  }
  let i = 0;
  const t0 = performance.now();
  timer = setInterval(() => {
    const now = (performance.now() - t0) * Number(speed);
    while (i < run.events.length && run.events[i].t <= now) apply(run.events[i++]);
    s.t = Math.min(now, s.ended?.duration ?? now);
    render();
    if (i >= run.events.length) {
      clearInterval(timer);
      finish('replay');
    }
  }, 100);
}

async function start() {
  if (q.get('live') === '1') return live();
  $('replay-controls').hidden = false;
  const sp = q.get('speed');
  // Any positive speed from the URL is allowed; add it to the menu when it is not one of the presets.
  if (sp && (sp === 'max' || Number(sp) > 0)) {
    const sel = $('replay-speed');
    if (![...sel.options].some((o) => o.value === sp)) sel.add(new Option(`${sp}×`, sp));
    sel.value = sp;
  }
  const run = await loadRun();
  if (!run) {
    setMode('no data', '');
    $('live-source').textContent = 'No recorded run found.';
    return;
  }
  replay(run);
  $('replay-restart').addEventListener('click', () => replay(run));
  $('replay-speed').addEventListener('change', () => replay(run));
}

start();
