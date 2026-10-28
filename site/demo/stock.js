import { candles, CANDLE_COUNT, pctOf, bidAsk } from './engine.js';
import { loadAlerts, loadWatchlist, href, saveAlerts, toggleWatch } from './store.js';
import { announce, fmtChg, fmtInt, fmtMcap, fmtPct, fmtPrice, h, flash, mountShell, requireUser, startMarket, svg } from './ui.js';
import { rowState } from './quote-table.js';

const STATE_LABEL = { ceiling: 'Ceiling', floor: 'Floor', reference: 'Reference', up: 'Up', down: 'Down' };
const W = 760;
const H = 330;
const PLOT = { l: 8, r: 54, t: 10, b: 66 }; // b leaves room for volume bars + x labels

function main() {
  mountShell('stock');
  const { market, params, onTick } = startMarket();
  const app = document.getElementById('app');
  const ticker = (new URLSearchParams(location.search).get('t') ?? '').trim().toUpperCase();
  const r = market.rows.get(ticker);

  if (!r) {
    document.title = 'MarketFlow (demo) · Ticker not found';
    app.append(
      h('section', { class: 'not-found', 'data-testid': 'not-found' }, h('h1', { text: 'Ticker not found' }), h('p', { text: `There is no VN30 ticker "${ticker || '(none)'}" in this demo.` }), h('a', { href: href('board.html'), text: 'Back to the board' })),
    );
    return;
  }
  document.title = `MarketFlow (demo) · ${r.t}`;

  // ---------- header ----------
  const last = h('p', { class: 'px-last', 'data-testid': 'stock-last' });
  const chg = h('p', { class: 'px-chg', 'data-testid': 'stock-change' });
  const badge = h('span', { class: 'state-badge', 'data-testid': 'stock-state' });
  const watchBtn = h('button', { type: 'button', class: 'mf-btn', onclick: () => {
    const on = toggleWatch(r.t);
    paintWatch(on);
    announce(`${r.t} ${on ? 'added to' : 'removed from'} watchlist`);
  } });
  const paintWatch = (on) => {
    watchBtn.textContent = on ? 'Remove from watchlist' : 'Add to watchlist';
    watchBtn.classList.toggle('is-on', on);
  };
  paintWatch(loadWatchlist().includes(r.t));

  const head = h(
    'section',
    { class: 'stock-head', 'aria-labelledby': 'stock-title', 'data-state': rowState(r) },
    h('div', { class: 'sh-id' }, h('a', { class: 'back', href: href('board.html'), text: '← Board' }), h('h1', { id: 'stock-title', 'data-testid': 'stock-ticker', text: r.t }), h('p', { class: 'sh-name', 'data-testid': 'stock-name', text: r.name })),
    h('div', { class: 'sh-px' }, last, chg, badge),
    h('div', { class: 'sh-act' }, watchBtn),
  );

  // ---------- chart ----------
  const history = candles(r, params.seed);
  const chart = buildChart(r, history);

  // ---------- stats ----------
  const stat = (id, label) => h('div', {}, h('dt', { text: label }), h('dd', { 'data-testid': `stat-${id}` }));
  const stats = h('dl', { class: 'stats' }, stat('ref', 'Reference'), stat('ceil', 'Ceiling'), stat('floor', 'Floor'), stat('pe', 'P/E'), stat('mcap', 'Market cap'), stat('sector', 'Sector'), stat('volume', 'Volume'), stat('bid', 'Best bid'), stat('ask', 'Best ask'));
  const sv = (id) => stats.querySelector(`[data-testid=stat-${id}]`);
  sv('ref').textContent = fmtPrice(r.ref);
  sv('ceil').textContent = fmtPrice(r.ceil);
  sv('floor').textContent = fmtPrice(r.floor);
  sv('pe').textContent = r.pe.toFixed(1);
  sv('mcap').textContent = `${fmtMcap(r.mcap)} bn`;
  sv('sector').textContent = r.sector;

  // ---------- alerts ----------
  const alertsBox = buildAlerts(r);

  app.append(
    head,
    h('div', { class: 'stock-grid' },
      h('section', { class: 'card chart-card', 'aria-labelledby': 'chart-title' }, h('h2', { id: 'chart-title', text: `Price chart · ${CANDLE_COUNT} sessions` }), chart.wrap),
      h('section', { class: 'card', 'aria-labelledby': 'stats-title' }, h('h2', { id: 'stats-title', text: 'Key statistics' }), stats),
      alertsBox,
    ),
  );

  // ---------- live values ----------
  let prevLast = r.last;
  function render() {
    const d = r.last - r.ref;
    const state = rowState(r);
    last.textContent = fmtPrice(r.last);
    chg.textContent = `${fmtChg(d)} (${fmtPct(pctOf(r.last, r.ref))})`;
    badge.textContent = STATE_LABEL[state];
    head.dataset.state = state;
    sv('volume').textContent = fmtInt(r.volume);
    const { bid, ask } = bidAsk(r);
    sv('bid').textContent = fmtPrice(bid);
    sv('ask').textContent = fmtPrice(ask);
    chart.setLast(r.last, state);
    if (r.last !== prevLast) flash(last, r.last > prevLast ? 1 : -1);
    prevLast = r.last;
  }
  render();
  onTick((changes) => {
    if (changes.some((c) => c.t === r.t)) render();
    else {
      sv('volume').textContent = fmtInt(r.volume);
    }
  });
}

// ---------- candlestick chart (inline SVG) ----------

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

function buildChart(r, data) {
  const lo = Math.min(...data.map((c) => c.low), r.floor);
  const hi = Math.max(...data.map((c) => c.high), r.ceil);
  const pad = (hi - lo) * 0.04;
  const min = lo - pad;
  const max = hi + pad;
  const volMax = Math.max(...data.map((c) => c.volume));
  const plotW = W - PLOT.l - PLOT.r;
  const priceH = H - PLOT.t - PLOT.b;
  const x = (i) => PLOT.l + (i + 0.5) * (plotW / data.length);
  const y = (p) => PLOT.t + (1 - (p - min) / (max - min)) * priceH;
  const bw = Math.max(3, (plotW / data.length) * 0.62);
  const volTop = H - PLOT.b + 8;
  const volH = 34;

  const root = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Candlestick chart of ${r.t}, last ${data.length} sessions, with today's reference, ceiling and floor`, 'data-testid': 'price-chart', focusable: 'false' });

  // grid + y labels
  const step = niceStep((max - min) / 5);
  const grid = svg('g', { class: 'grid' });
  for (let p = Math.ceil(min / step) * step; p <= max; p += step) {
    grid.append(svg('line', { x1: PLOT.l, x2: W - PLOT.r, y1: y(p).toFixed(1), y2: y(p).toFixed(1) }));
    const t = svg('text', { x: W - PLOT.r + 6, y: (y(p) + 4).toFixed(1), class: 'ax' });
    t.textContent = fmtPrice(p);
    grid.append(t);
  }
  root.append(grid);

  // reference / ceiling / floor lines for today's band
  const band = svg('g', { class: 'band' });
  for (const [cls, label, price] of [['b-ceil', 'Ceil', r.ceil], ['b-ref', 'Ref', r.ref], ['b-floor', 'Floor', r.floor]]) {
    band.append(svg('line', { class: cls, x1: PLOT.l, x2: W - PLOT.r, y1: y(price).toFixed(1), y2: y(price).toFixed(1) }));
    const t = svg('text', { class: `bl ${cls}`, x: PLOT.l + 4, y: (y(price) - 4).toFixed(1) });
    t.textContent = `${label} ${fmtPrice(price)}`;
    band.append(t);
  }
  root.append(band);

  // candles + volume
  const gC = svg('g', { class: 'candles' });
  const gV = svg('g', { class: 'vols' });
  data.forEach((c, i) => {
    const dir = c.close > c.open ? 'up' : c.close < c.open ? 'down' : 'flat';
    const top = y(Math.max(c.open, c.close));
    const bot = y(Math.min(c.open, c.close));
    const g = svg('g', { class: `candle ${dir}`, 'data-testid': 'candle', 'data-dir': dir });
    g.append(
      svg('line', { x1: x(i).toFixed(1), x2: x(i).toFixed(1), y1: y(c.high).toFixed(1), y2: y(c.low).toFixed(1) }),
      svg('rect', { x: (x(i) - bw / 2).toFixed(1), y: top.toFixed(1), width: bw.toFixed(1), height: Math.max(1.5, bot - top).toFixed(1), rx: 1 }),
    );
    const title = svg('title');
    title.textContent = `${data.length - i === 1 ? 'Previous session' : `${data.length - i} sessions ago`}: open ${fmtPrice(c.open)}, high ${fmtPrice(c.high)}, low ${fmtPrice(c.low)}, close ${fmtPrice(c.close)}`;
    g.append(title);
    gC.append(g);
    const vh = (c.volume / volMax) * volH;
    gV.append(svg('rect', { class: dir, x: (x(i) - bw / 2).toFixed(1), y: (volTop + volH - vh).toFixed(1), width: bw.toFixed(1), height: vh.toFixed(1) }));
  });
  root.append(gV, gC);

  // x labels
  const gx = svg('g', { class: 'grid' });
  for (const i of [0, 20, 40, data.length - 1]) {
    const t = svg('text', { x: x(i).toFixed(1), y: H - 6, class: 'ax', 'text-anchor': i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle' });
    t.textContent = i === data.length - 1 ? 'Last session' : `${data.length - i} sessions ago`;
    gx.append(t);
  }
  root.append(gx);

  // today's last price (moves in live mode)
  const lastLine = svg('line', { class: 'last-line', x1: PLOT.l, x2: W - PLOT.r });
  const lastTag = svg('rect', { class: 'last-tag', x: W - PLOT.r + 1, width: PLOT.r - 2, height: 18, rx: 4 });
  const lastTxt = svg('text', { class: 'last-txt', x: W - PLOT.r + 6 });
  const gl = svg('g', { class: 'last', 'data-testid': 'chart-last' }, lastLine, lastTag, lastTxt);
  root.append(gl);

  return {
    wrap: h('div', { class: 'chart-scroll' }, root),
    setLast(price, state) {
      const yy = y(price).toFixed(1);
      lastLine.setAttribute('y1', yy);
      lastLine.setAttribute('y2', yy);
      lastTag.setAttribute('y', (y(price) - 9).toFixed(1));
      lastTxt.setAttribute('y', (y(price) + 4).toFixed(1));
      lastTxt.textContent = fmtPrice(price);
      gl.setAttribute('data-state', state);
    },
  };
}

// ---------- price alerts ----------

/** Returns { price } in VND, or { error }. Rule: a positive number with at most 2 decimals (VND thousands). */
export function validateAlertPrice(raw) {
  const v = raw.trim();
  if (!v) return { error: 'Enter an alert price' };
  if (!/^\d+(\.\d+)?$/.test(v) || Number(v) <= 0) return { error: 'Price must be a positive number' };
  if ((v.split('.')[1] ?? '').length > 2) return { error: 'Use at most 2 decimal places' };
  return { price: Math.round(Number(v) * 1000) };
}

function buildAlerts(r) {
  const input = h('input', { id: 'alert-price', name: 'price', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: fmtPrice(r.ref), 'aria-describedby': 'alert-error' });
  const dir = h('select', { id: 'alert-dir', name: 'direction' }, h('option', { value: 'above', text: 'Above' }), h('option', { value: 'below', text: 'Below' }));
  const error = h('p', { class: 'error', role: 'alert', id: 'alert-error', hidden: true });
  const list = h('ul', { class: 'alert-list', 'aria-label': `Alerts for ${r.t}` });
  const empty = h('p', { class: 'empty', 'data-testid': 'alerts-empty', text: `No alerts set for ${r.t}.` });

  const form = h(
    'form',
    { class: 'alert-form', novalidate: true, 'aria-label': 'New price alert' },
    h('div', { class: 'field' }, h('label', { for: 'alert-dir', text: 'Condition' }), dir),
    h('div', { class: 'field' }, h('label', { for: 'alert-price', text: 'Alert price (VND thousands)' }), input),
    h('button', { type: 'submit', class: 'mf-btn primary', text: 'Add alert' }),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = validateAlertPrice(input.value);
    if (res.error) {
      error.textContent = res.error;
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    error.hidden = true;
    input.removeAttribute('aria-invalid');
    saveAlerts([...loadAlerts(), { id: crypto.randomUUID(), t: r.t, dir: dir.value, price: res.price, fired: false }]);
    input.value = '';
    paint();
    announce(`Alert added: ${dir.value} ${fmtPrice(res.price)}`);
  });

  function paint() {
    const mine = loadAlerts().filter((a) => a.t === r.t);
    list.replaceChildren(
      ...mine.map((a) => {
        const text = `${a.dir === 'above' ? 'Above' : 'Below'} ${fmtPrice(a.price)}`;
        return h(
          'li',
          { class: a.fired ? 'alert-item fired' : 'alert-item', 'data-id': a.id },
          h('span', { class: 'al-text', text }),
          a.fired ? h('span', { class: 'al-badge', text: 'Triggered' }) : null,
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Delete alert ${text}`, onclick: () => {
            saveAlerts(loadAlerts().filter((x) => x.id !== a.id));
            paint();
            announce('Alert deleted');
          } }, '✕'),
        );
      }),
    );
    empty.hidden = mine.length > 0;
  }
  paint();
  window.addEventListener('marketflow:alerts', paint);

  return h('section', { class: 'card alerts', 'aria-labelledby': 'alerts-title' }, h('h2', { id: 'alerts-title', text: 'Price alert' }), h('p', { class: 'hint', text: 'Get a toast when the simulated price crosses your level. Alerts only fire in live mode.' }), form, error, list, empty);
}

if (requireUser()) main();
