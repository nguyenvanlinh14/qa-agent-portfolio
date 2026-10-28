import { SECTORS } from './data.js';
import { pctOf } from './engine.js';
import { createQuoteRow } from './quote-table.js';
import { fmtMcap, h, mountShell, requireUser, startMarket } from './ui.js';

if (requireUser()) main();

function main() {
  mountShell('screener');
  const { market, onTick } = startMarket();
  const tbody = document.getElementById('rows');
  const count = document.querySelector('[data-testid=result-count]');
  const empty = document.getElementById('empty');
  const note = document.getElementById('range-note');
  const form = document.getElementById('filters');
  const sector = document.getElementById('f-sector');
  const num = (id) => document.getElementById(id);

  sector.append(h('option', { value: '', text: 'All sectors' }), ...SECTORS.map((s) => h('option', { value: s, text: s })));

  const rows = market.list.map((r) => {
    const tail = document.createDocumentFragment();
    tail.append(h('td', { class: 'num', 'data-testid': 'pe', text: r.pe.toFixed(1) }), h('td', { class: 'num', 'data-testid': 'mcap', text: fmtMcap(r.mcap) }), h('td', { class: 'txt', 'data-testid': 'sector', text: r.sector }));
    return createQuoteRow(r, ['last', 'pct'], tail);
  });
  tbody.append(...rows.map((q) => q.tr));

  /** Blank or non-numeric input means "no limit". */
  const limit = (id) => {
    const raw = num(id).value.trim();
    const n = raw === '' ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  function apply() {
    const peMax = limit('f-pe');
    const mcapMin = limit('f-mcap');
    const pMin = limit('f-pmin');
    const pMax = limit('f-pmax');
    note.hidden = !(pMin !== null && pMax !== null && pMin > pMax);
    let shown = 0;
    for (const q of rows) {
      const { r } = q;
      const pct = Math.round(pctOf(r.last, r.ref) * 100) / 100; // compare what the table shows
      const ok =
        (!sector.value || r.sector === sector.value) &&
        (peMax === null || r.pe <= peMax) &&
        (mcapMin === null || r.mcap >= mcapMin) &&
        (pMin === null || pct >= pMin) &&
        (pMax === null || pct <= pMax);
      q.tr.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = `${shown} ${shown === 1 ? 'result' : 'results'}`;
    empty.hidden = shown > 0;
  }

  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  form.addEventListener('reset', () => setTimeout(apply)); // after the browser has cleared the fields
  form.addEventListener('submit', (e) => e.preventDefault());
  apply();
  onTick(() => {
    for (const q of rows) q.update();
    apply();
  });
}
