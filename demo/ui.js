// MarketFlow (demo) shared UI: formatters, the app shell (nav, theme toggle, sign out), toasts, the polite
// live region and the market runner that drives every page.
import { createMarket, parseParams, TICK_MS } from './engine.js';
import { currentUser, href, loadAlerts, logout, saveAlerts } from './store.js';
import { motionAllowed } from './liquid.js';

// ---------- formatters (prices are VND; the UI shows thousands with 2 decimals) ----------

export const fmtPrice = (v) => (v / 1000).toFixed(2);
export const fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function fmtChg(d) {
  if (d === 0) return '0.00';
  return `${d > 0 ? '+' : '-'}${(Math.abs(d) / 1000).toFixed(2)}`;
}
export function fmtPct(p) {
  const s = Math.abs(p).toFixed(2);
  if (Number(s) === 0) return '0.00%';
  return `${p > 0 ? '+' : '-'}${s}%`;
}
export const fmtMcap = (bn) => fmtInt(bn);

// ---------- tiny DOM helper ----------

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children);
  return el;
}

// ---------- live region + toasts ----------

let liveRegion;
let toastBox;

/** Polite announcements for user actions only (sort, filter, watchlist). Never called on price ticks. */
export function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  // A change of text is what screen readers pick up; clear first so repeated messages are re-read.
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 30);
}

export function toast(message) {
  if (!toastBox) return;
  const el = h(
    'div',
    { class: 'mf-toast', 'data-testid': 'toast' },
    h('span', { text: message }),
    h('button', { type: 'button', class: 'mf-toast-close', 'aria-label': 'Dismiss notification', onclick: () => el.remove() }, '×'),
  );
  toastBox.append(el);
  setTimeout(() => el.remove(), 8000);
}

// ---------- shell ----------

const GOO_FILTER = `<svg class="mf-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <filter id="mf-goo" x="-20%" y="-60%" width="140%" height="220%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
    <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
  </filter></defs></svg>`;

const LOGO = `<svg class="mf-logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <rect width="32" height="32" rx="9" fill="var(--logo-bg, #6a47ff)" />
  <path d="M9 21v-6M9 12v-2M16 23v-9M16 11V8M23 20v-5M23 12v-3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
  <rect x="7.4" y="12" width="3.2" height="3.4" rx=".8" fill="#fff" /><rect x="14.4" y="14" width="3.2" height="6" rx=".8" fill="#fff" opacity=".85" />
  <rect x="21.4" y="12.5" width="3.2" height="4.6" rx=".8" fill="#fff" />
</svg>`;

const PAGES = [
  ['board', 'Board', 'board.html'],
  ['watchlist', 'Watchlist', 'watchlist.html'],
  ['screener', 'Screener', 'screener.html'],
];

function placeIndicator(tabs, active, animate) {
  const ind = tabs.querySelector('.mf-ind');
  const link = tabs.querySelector('a[aria-current="page"]');
  if (!ind || !link) return;
  const to = { x: link.offsetLeft, w: link.offsetWidth };
  const set = (p) => {
    ind.style.setProperty('--x', `${p.x}px`);
    ind.style.setProperty('--w', `${p.w}px`);
  };
  let from = null;
  try {
    from = JSON.parse(sessionStorage.getItem('marketflow.navx') ?? 'null');
  } catch {
    /* storage blocked: no slide, just place it */
  }
  if (animate && from && (from.x !== to.x || from.w !== to.w)) {
    ind.classList.add('is-sliding');
    set(from);
    void ind.offsetWidth; // commit the start position, then let the CSS transition run to the target
    requestAnimationFrame(() => set(to));
    setTimeout(() => ind.classList.remove('is-sliding'), 900);
  } else {
    set(to);
  }
  try {
    sessionStorage.setItem('marketflow.navx', JSON.stringify(to));
  } catch {
    /* ignore */
  }
}

export function modeLabel(params) {
  return params.frozen ? `Frozen · seed ${params.seed}` : 'Live · simulated';
}

/** Renders the nav into <header id="mf-header"> and the live/toast regions. `active`: board | watchlist | screener | stock. */
export function mountShell(active) {
  const user = currentUser();
  const header = document.getElementById('mf-header');
  const animate = motionAllowed();
  const tabs = h(
    'nav',
    { class: 'mf-tabs', 'aria-label': 'Main' },
    h('span', { class: 'mf-ind', 'aria-hidden': 'true' }, h('i'), h('i')),
    ...PAGES.map(([id, label, page]) => h('a', { href: href(page), 'aria-current': id === active ? 'page' : null, text: label })),
  );
  const toggle = h('button', { type: 'button', class: 'mf-icon-btn', 'aria-label': 'Toggle light or dark theme', onclick: toggleTheme }, '◐');
  header.className = 'mf-header';
  header.innerHTML = GOO_FILTER;
  header.append(
    h(
      'div',
      { class: 'mf-bar' },
      h('a', { class: 'mf-brand', href: href('board.html'), 'aria-label': 'MarketFlow (demo) home' }, ...htmlNodes(LOGO), h('span', { text: 'MarketFlow' }), h('small', { text: '(demo)' })),
      tabs,
      h(
        'div',
        { class: 'mf-user' },
        h('span', { class: 'mf-email', 'data-testid': 'current-user', text: user ?? '' }),
        toggle,
        h('button', { type: 'button', class: 'mf-btn', onclick: () => { logout(); location.replace(href('index.html')); } }, 'Sign out'),
      ),
    ),
  );
  if (animate) tabs.classList.add('liquid');
  placeIndicator(tabs, active, animate);

  liveRegion = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'aria-label': 'Status updates', 'data-testid': 'live-region' });
  toastBox = h('div', { class: 'mf-toasts', role: 'status', 'aria-live': 'polite', 'aria-label': 'Alert notifications' });
  document.body.append(liveRegion, toastBox);
}

function htmlNodes(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return [...t.content.childNodes];
}

function toggleTheme() {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try {
    localStorage.setItem('linhqa-theme', root.dataset.theme);
  } catch {
    /* ignore */
  }
}

// ---------- row flash (short liquid ripple) ----------

export function flash(el, dir) {
  if (!el || !dir) return;
  const cls = dir > 0 ? 'flash-up' : 'flash-down';
  const running = el.classList.contains('flash-up') || el.classList.contains('flash-down');
  el.classList.remove('flash-up', 'flash-down');
  // Re-triggering a running ripple needs a frame between remove and add; doing that with a forced reflow is costly.
  if (running) requestAnimationFrame(() => el.classList.add(cls));
  else el.classList.add(cls);
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 800);
}

// ---------- the market runner ----------

/**
 * Creates the seeded market for this page and, unless `frozen=1`, advances it every TICK_MS.
 * Live mode continues from where the previous page left off (the start time is kept in sessionStorage), so
 * prices do not jump back when you navigate. Alerts are evaluated on every page.
 * Subscribers get the merged changes of the tick: [{ t, prev, last }].
 */
export function startMarket() {
  const params = parseParams(location.search);
  const market = createMarket(params.seed);
  const listeners = new Set();
  const stats = (window.__marketflow = { mode: params.frozen ? 'frozen' : 'live', seed: params.seed, ticks: 0, avgTickMs: 0 });
  document.documentElement.dataset.mode = stats.mode;

  if (!params.frozen) {
    const key = `marketflow.live.${params.seed}`;
    let t0 = 0;
    try {
      t0 = Number(sessionStorage.getItem(key)) || 0;
      if (!t0) sessionStorage.setItem(key, String((t0 = Date.now())));
    } catch {
      t0 = Date.now();
    }
    let applied = 0;
    const advance = (limit, evaluate) => {
      const target = Math.min(Math.floor((Date.now() - t0) / TICK_MS), applied + limit);
      const net = new Map();
      while (applied < target) {
        applied++;
        const changes = market.step();
        for (const c of changes) {
          const seen = net.get(c.t);
          net.set(c.t, { t: c.t, prev: seen ? seen.prev : c.prev, last: c.last });
          if (evaluate) checkAlerts(c);
        }
      }
      return [...net.values()];
    };
    advance(50000, false); // silent catch-up to "now"
    setInterval(() => {
      if (document.hidden) return;
      const started = performance.now();
      const changes = advance(500, true);
      if (changes.length) for (const fn of listeners) fn(changes);
      const ms = performance.now() - started;
      stats.avgTickMs = (stats.avgTickMs * stats.ticks + ms) / (stats.ticks + 1);
      stats.ticks++;
    }, TICK_MS);
  }

  return { market, params, onTick: (fn) => listeners.add(fn) };
}

function checkAlerts({ t, prev, last }) {
  const alerts = loadAlerts();
  let dirty = false;
  for (const a of alerts) {
    if (a.t !== t || a.fired) continue;
    const hit = a.dir === 'above' ? prev < a.price && last >= a.price : prev > a.price && last <= a.price;
    if (!hit) continue;
    a.fired = true;
    dirty = true;
    toast(`${t} crossed ${a.dir === 'above' ? 'above' : 'below'} ${fmtPrice(a.price)} (last ${fmtPrice(last)})`);
  }
  if (dirty) {
    saveAlerts(alerts);
    window.dispatchEvent(new CustomEvent('marketflow:alerts'));
  }
}

/** Page guard used by every page module: returns the user, or redirects to the login page. */
export function requireUser() {
  const user = currentUser();
  if (!user) location.replace(href('index.html'));
  return user;
}
