// Client-side "backend" for the demo app so it also works on static GitHub Pages.
// The real REST API (server/app.mjs) is covered by the API test project.
// Storage keys are all prefixed `marketflow.`; the site theme key `linhqa-theme` is only read by boot.js and the
// theme toggle. Never write the key `theme`: it belongs to the Playwright HTML report on the same origin.
const SESSION_KEY = 'marketflow.session';
const DEMO_USERS = { 'qa@demo.dev': 'Passw0rd!' };

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
const readJson = (storage, key, fallback) => safe(() => JSON.parse(storage.getItem(key) ?? 'null') ?? fallback, fallback);

// ---------- session ----------

/** `remember` keeps the session in localStorage; otherwise it lives in sessionStorage (ends with the tab). */
export function login(email, password, remember = true) {
  if (DEMO_USERS[email] !== password) return false;
  const value = JSON.stringify({ email, at: Date.now() });
  safe(() => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, value);
  });
  return true;
}

export function currentUser() {
  return readJson(localStorage, SESSION_KEY, null)?.email ?? readJson(sessionStorage, SESSION_KEY, null)?.email ?? null;
}

export function logout() {
  safe(() => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  });
}

// ---------- test-mode query params (?seed=N&frozen=1&defect=name) travel with every in-app link ----------

export function carry() {
  const q = new URLSearchParams(location.search);
  const out = new URLSearchParams();
  for (const k of ['seed', 'frozen', 'defect']) if (q.has(k)) out.set(k, q.get(k));
  const s = out.toString();
  return s ? `?${s}` : '';
}

/**
 * Fault injection for training and evidence demos: `?defect=<name>` switches on one known, documented bug.
 * Without the parameter the app behaves normally. Known names: `watchlist-remove-not-saved`.
 */
export const defect = (name) => new URLSearchParams(location.search).get('defect') === name;

/** href('stock.html', { t: 'ACB' }) -> stock.html?t=ACB&seed=42&frozen=1 */
export function href(page, extra = {}) {
  const q = new URLSearchParams(extra);
  for (const [k, v] of new URLSearchParams(carry())) q.set(k, v);
  const s = q.toString();
  return s ? `${page}?${s}` : page;
}

// ---------- per-user lists ----------

const key = (name) => `marketflow.${name}.${currentUser() ?? 'anonymous'}`;

export const loadWatchlist = () => {
  const list = readJson(localStorage, key('watchlist'), []);
  return Array.isArray(list) ? list.filter((t) => typeof t === 'string') : [];
};
export const saveWatchlist = (list) => safe(() => localStorage.setItem(key('watchlist'), JSON.stringify(list)));

export function toggleWatch(ticker) {
  const list = loadWatchlist();
  const on = !list.includes(ticker);
  saveWatchlist(on ? [...list, ticker] : list.filter((t) => t !== ticker));
  return on;
}

/** Alert: { id, t, dir: 'above' | 'below', price (VND), fired } */
export const loadAlerts = () => {
  const list = readJson(localStorage, key('alerts'), []);
  return Array.isArray(list) ? list : [];
};
export const saveAlerts = (list) => safe(() => localStorage.setItem(key('alerts'), JSON.stringify(list)));
