// Shared quote rows for the board and the watchlist: stable DOM nodes that are updated in place on every tick.
import { bidAsk, pctOf, stateOf } from './engine.js';
import { href } from './store.js';
import { flash, fmtChg, fmtInt, fmtPct, fmtPrice, h, svg } from './ui.js';

export const COLUMNS = {
  ref: { label: 'Ref', title: 'Reference price', value: (r) => r.ref, text: (r) => fmtPrice(r.ref) },
  ceil: { label: 'Ceil', title: 'Ceiling price (+7%)', value: (r) => r.ceil, text: (r) => fmtPrice(r.ceil) },
  floor: { label: 'Floor', title: 'Floor price (-7%)', value: (r) => r.floor, text: (r) => fmtPrice(r.floor) },
  last: { label: 'Last', title: 'Last price', value: (r) => r.last, text: (r) => fmtPrice(r.last) },
  chg: { label: 'Chg', title: 'Change vs reference', value: (r) => r.last - r.ref, text: (r) => fmtChg(r.last - r.ref) },
  pct: { label: '%Chg', title: 'Percent change vs reference', value: (r) => pctOf(r.last, r.ref), text: (r) => fmtPct(pctOf(r.last, r.ref)) },
  volume: { label: 'Volume', title: 'Matched volume (shares)', value: (r) => r.volume, text: (r) => fmtInt(r.volume) },
  bid: { label: 'Bid', title: 'Best bid', value: (r) => bidAsk(r).bid, text: (r) => fmtPrice(bidAsk(r).bid) },
  ask: { label: 'Ask', title: 'Best ask', value: (r) => bidAsk(r).ask, text: (r) => fmtPrice(bidAsk(r).ask) },
};

export const rowState = (r) => stateOf(r.last, r.ref, r.ceil, r.floor);

export function createQuoteRow(r, keys, trailing = null) {
  const tr = h('tr', { 'data-ticker': r.t });
  const link = h('a', { href: href('stock.html', { t: r.t }), text: r.t });
  tr.append(h('th', { scope: 'row', class: 'tk' }, link, h('span', { class: 'nm', text: r.name })));
  const cells = {};
  for (const k of keys) {
    cells[k] = h('td', { class: `num c-${k}`, 'data-testid': k });
    tr.append(cells[k]);
  }
  if (trailing) tr.append(trailing);
  const cache = {};
  let prevLast = r.last;

  /** Writes only what changed; flashes the price cells with a liquid ripple when the last price moved. */
  const update = () => {
    const state = rowState(r);
    if (tr.dataset.state !== state) {
      tr.dataset.state = state;
      tr.className = `q-row st-${state}`;
    }
    for (const k of keys) {
      const text = COLUMNS[k].text(r);
      if (cache[k] !== text) {
        cache[k] = text;
        cells[k].textContent = text;
      }
    }
    if (r.last !== prevLast) {
      const dir = r.last > prevLast ? 1 : -1;
      for (const k of ['last', 'chg', 'pct']) flash(cells[k], dir);
      prevLast = r.last;
    }
  };
  update();
  // Whole-row click opens the detail page; the ticker link and buttons keep their own behaviour.
  tr.addEventListener('click', (e) => {
    if (e.target.closest('a,button')) return;
    location.assign(link.href);
  });
  return { tr, r, cells, update };
}

const STAR = 'M12 3.3l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.6l6-.8z';

/** Star toggle; the label flips between "Add X to watchlist" and "Remove X from watchlist". */
export function createStar(ticker, on, onToggle) {
  const btn = h('button', { type: 'button', class: 'star' });
  btn.append(svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, svg('path', { d: STAR })));
  const paint = (isOn) => {
    btn.classList.toggle('is-on', isOn);
    btn.setAttribute('aria-label', isOn ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`);
  };
  paint(on);
  btn.addEventListener('click', () => paint(onToggle()));
  return { btn, paint };
}
