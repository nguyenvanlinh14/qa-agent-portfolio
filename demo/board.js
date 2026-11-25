import { SECTORS } from './data.js';
import { summarize } from './engine.js';
import { addBlobs } from './liquid.js';
import { COLUMNS, createQuoteRow, createStar } from './quote-table.js';
import { loadWatchlist, toggleWatch } from './store.js';
import { announce, fmtChg, fmtInt, fmtPct, fmtPrice, h, modeLabel, mountShell, requireUser, startMarket } from './ui.js';
import { initSummaryBlob } from './summary-blob.js';

if (requireUser()) main();

function main() {
  mountShell('board');
  const { market, params, onTick } = startMarket();
  initSummaryBlob(addBlobs);

  const KEYS = ['ref', 'ceil', 'floor', 'last', 'chg', 'pct', 'volume', 'bid', 'ask'];
  const SORT_KEYS = { t: { label: 'Ticker', text: true, value: (r) => r.t }, ...Object.fromEntries(KEYS.map((k) => [k, { label: COLUMNS[k].label, value: COLUMNS[k].value }])) };
  const tbody = document.getElementById('rows');
  const headRow = document.getElementById('head-row');
  const count = document.querySelector('[data-testid=result-count]');
  const empty = document.getElementById('empty');
  const watch = new Set(loadWatchlist());
  const view = { query: '', sector: 'All', key: null, dir: null };

  // ---- header: sortable columns ----
  const ths = new Map();
  for (const key of ['t', ...KEYS]) {
    const th = h('th', { scope: 'col', 'aria-sort': 'none', title: COLUMNS[key]?.title ?? 'Ticker and company', class: key === 't' ? 'tk' : 'num' });
    // The arrow lives in an aria-hidden span: generated content would leak into the button's accessible name.
    th.append(h('button', { type: 'button', onclick: () => sortBy(key) }, SORT_KEYS[key].label, h('span', { class: 'sort-ind', 'aria-hidden': 'true' })));
    ths.set(key, th);
    headRow.append(th);
  }
  headRow.append(h('th', { scope: 'col', class: 'star-col' }, h('span', { class: 'sr-only', text: 'Watchlist' })));

  // ---- rows (built once, updated in place) ----
  const rows = market.list.map((r) => {
    const star = createStar(r.t, watch.has(r.t), () => {
      const on = toggleWatch(r.t);
      on ? watch.add(r.t) : watch.delete(r.t);
      announce(`${r.t} ${on ? 'added to' : 'removed from'} watchlist`);
      return on;
    });
    const q = createQuoteRow(r, KEYS, h('td', { class: 'star-cell' }, star.btn));
    q.haystack = `${r.t} ${r.name}`.toLowerCase();
    return q;
  });
  tbody.append(...rows.map((q) => q.tr));

  // ---- sector chips ----
  const chips = document.getElementById('chips');
  const chipBtns = ['All', ...SECTORS].map((s) => h('button', { type: 'button', 'aria-pressed': String(s === 'All'), class: 'chip', onclick: () => pickSector(s), text: s }));
  chips.append(...chipBtns);

  // ---- view pipeline ----
  let announceTimer = 0;
  function apply({ say = false } = {}) {
    let shown = 0;
    for (const q of rows) {
      const ok = (view.sector === 'All' || q.r.sector === view.sector) && (!view.query || q.haystack.includes(view.query));
      q.tr.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = `Showing ${shown} of ${rows.length} stocks`;
    empty.hidden = shown > 0;
    reorder();
    if (say) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => announce(`${shown} of ${rows.length} stocks shown`), 500);
    }
  }

  function reorder() {
    const base = rows.slice().sort((a, b) => a.r.t.localeCompare(b.r.t));
    let ordered = base;
    if (view.key) {
      const val = SORT_KEYS[view.key].value;
      ordered = base.sort((a, b) => {
        const va = val(a.r);
        const vb = val(b.r);
        const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return c || a.r.t.localeCompare(b.r.t);
      });
      if (view.dir === 'descending') ordered.reverse();
    }
    const current = tbody.children;
    if (ordered.some((q, i) => current[i] !== q.tr)) tbody.append(...ordered.map((q) => q.tr));
  }

  function sortBy(key) {
    view.dir = view.key === key ? (view.dir === 'ascending' ? 'descending' : 'ascending') : SORT_KEYS[key].text ? 'ascending' : 'descending';
    view.key = key;
    for (const [k, th] of ths) th.setAttribute('aria-sort', k === key ? view.dir : 'none');
    reorder();
    announce(`Sorted by ${SORT_KEYS[key].label}, ${view.dir}`);
  }

  function pickSector(s) {
    view.sector = s;
    chipBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === s)));
    apply({ say: true });
  }

  document.getElementById('q').addEventListener('input', (e) => {
    view.query = e.target.value.trim().toLowerCase();
    apply({ say: true });
  });

  // ---- summary bar ----
  const $ = (id) => document.querySelector(`[data-testid=${id}]`);
  const el = { value: $('index-value'), chg: $('index-change'), up: $('breadth-up'), flat: $('breadth-flat'), down: $('breadth-down'), ceil: $('breadth-ceiling'), floor: $('breadth-floor'), vol: $('breadth-volume') };
  function renderSummary() {
    const s = summarize(market.list);
    el.value.textContent = s.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const d = Math.round(s.change * 100) / 100;
    el.chg.textContent = `${d > 0 ? '+' : d < 0 ? '-' : ''}${Math.abs(d).toFixed(2)} (${fmtPct(s.pct)})`;
    el.chg.dataset.dir = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    el.up.textContent = String(s.advancers);
    el.flat.textContent = String(s.unchanged);
    el.down.textContent = String(s.decliners);
    el.ceil.textContent = String(s.ceiling);
    el.floor.textContent = String(s.floor);
    el.vol.textContent = fmtInt(s.volume);
  }
  $('market-mode').textContent = modeLabel(params);
  $('market-mode').dataset.mode = params.frozen ? 'frozen' : 'live';

  // ---- go ----
  apply();
  renderSummary();
  onTick(() => {
    for (const q of rows) q.update();
    renderSummary();
    // Keep a sorted column sorted, but never move rows under the pointer or the keyboard focus.
    if (view.key && !tbody.matches(':hover') && !tbody.contains(document.activeElement)) reorder();
  });
}
