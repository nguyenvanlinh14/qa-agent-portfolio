import { createQuoteRow, createStar } from './quote-table.js';
import { defect, href, loadWatchlist, saveWatchlist } from './store.js';
import { announce, h, mountShell, requireUser, startMarket } from './ui.js';

if (requireUser()) main();

function main() {
  mountShell('watchlist');
  const { market, onTick } = startMarket();
  document.getElementById('to-board').href = href('board.html');

  const tbody = document.getElementById('rows');
  const wrap = document.getElementById('wrap');
  const empty = document.getElementById('empty');
  const count = document.querySelector('[data-testid=watchlist-count]');
  const rows = new Map();

  function remove(ticker) {
    // Injected defect: the row goes away but the list is never saved, so the stock comes back after a reload.
    if (!defect('watchlist-remove-not-saved')) saveWatchlist(loadWatchlist().filter((t) => t !== ticker));
    rows.get(ticker)?.tr.remove();
    rows.delete(ticker);
    announce(`${ticker} removed from watchlist`);
    syncChrome();
  }

  function syncChrome() {
    const n = rows.size;
    count.textContent = `${n} ${n === 1 ? 'stock' : 'stocks'}`;
    wrap.hidden = n === 0;
    empty.hidden = n !== 0;
  }

  for (const t of loadWatchlist()) {
    const r = market.rows.get(t);
    if (!r || rows.has(t)) continue;
    // Same star as the board, always "on" here: clicking it removes the stock.
    const star = createStar(t, true, () => {
      remove(t);
      return false;
    });
    const q = createQuoteRow(r, ['ref', 'last', 'chg', 'pct', 'volume'], h('td', { class: 'star-cell' }, star.btn));
    rows.set(t, q);
    tbody.append(q.tr);
  }
  syncChrome();
  onTick(() => rows.forEach((q) => q.update()));
}
