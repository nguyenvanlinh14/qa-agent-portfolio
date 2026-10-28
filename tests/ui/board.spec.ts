import { test, expect } from '../fixtures';
import {
  DISCLAIMER,
  INDEX_NAME,
  KNOWN_ROWS,
  LIVE_QUERY,
  SECTORS,
  SEED_42_BREADTH,
  SEED_42_INDEX,
  TICKERS_BY_PCT_ASC,
  TICKERS_BY_PCT_DESC,
  VN30,
  VN30_TICKERS,
  expectedRow,
  stocksIn,
  type RowState,
} from '../data/market';

// Every spec below runs on the deterministic snapshot (?seed=42&frozen=1) unless it says "live".
test.describe('Market board', () => {
  test.beforeEach(async ({ boardPage }) => {
    await boardPage.open();
  });

  test('@smoke lists the 30 VN30 constituents', async ({ boardPage }) => {
    await expect(boardPage.heading).toBeVisible();
    await expect(boardPage.rows).toHaveCount(30);
    await expect(boardPage.tickers).toHaveText([...VN30_TICKERS]);
  });

  test('@smoke the summary bar shows the simulated VN30 index', async ({ boardPage }) => {
    await expect(boardPage.indexHeading).toHaveText(INDEX_NAME);
    await expect(boardPage.indexValue).toHaveText(SEED_42_INDEX.value);
    await expect(boardPage.indexChange).toHaveText(SEED_42_INDEX.change);
  });

  test('@regression index breadth counts add up to the 30 constituents', async ({ boardPage }) => {
    await expect(boardPage.advancing).toHaveText(String(SEED_42_BREADTH.advancing));
    await expect(boardPage.unchanged).toHaveText(String(SEED_42_BREADTH.unchanged));
    await expect(boardPage.declining).toHaveText(String(SEED_42_BREADTH.declining));
  });

  test('@regression the board says it is frozen and shows the seed', async ({ boardPage }) => {
    await expect(boardPage.mode).toHaveText('Frozen · seed 42');
  });

  test('@regression the demo disclaimer is visible', async ({ boardPage }) => {
    await expect(boardPage.disclaimer).toHaveText(DISCLAIMER);
  });

  test('@regression the nav marks the board as the current page', async ({ boardPage }) => {
    await expect(boardPage.boardLink).toHaveAttribute('aria-current', 'page');
    await expect(boardPage.watchlistLink).not.toHaveAttribute('aria-current', 'page');
  });

  test('@regression every column has a sortable header with aria-sort', async ({ boardPage }) => {
    await expect(boardPage.columnHeader('Last')).toHaveAttribute('aria-sort', 'none');
    await boardPage.sortBy('Last');
    await expect(boardPage.columnHeader('Last')).toHaveAttribute('aria-sort', 'descending');
  });

  test.describe('prices follow the HOSE band rules', () => {
    test('@regression ceiling and floor are reference x 1.07 / x 0.93 rounded to the tick, for all 30 rows', async ({ boardPage }) => {
      await expect(boardPage.table.getByTestId('ceil')).toHaveText(VN30.map((s) => expectedRow(s.ticker).text.ceil));
      await expect(boardPage.table.getByTestId('floor')).toHaveText(VN30.map((s) => expectedRow(s.ticker).text.floor));
    });

    test('@regression last prices match the seed-42 snapshot', async ({ boardPage }) => {
      await expect(boardPage.lastPrices).toHaveText(VN30.map((s) => expectedRow(s.ticker).text.last));
    });

    for (const state of ['ceiling', 'floor', 'reference'] as const satisfies readonly RowState[]) {
      const ticker = KNOWN_ROWS[state][0];

      test(`@regression a stock at its ${state} price is marked as ${state} (${ticker})`, async ({ boardPage }) => {
        const row = expectedRow(ticker);
        await expect(boardPage.row(ticker)).toHaveAttribute('data-state', state);
        await expect(boardPage.cell(ticker, 'last')).toHaveText(state === 'ceiling' ? row.text.ceil : state === 'floor' ? row.text.floor : row.text.ref);
      });
    }

    test('@regression a stock trading above the reference is marked as up, below as down', async ({ boardPage }) => {
      await expect(boardPage.row(KNOWN_ROWS.up[0])).toHaveAttribute('data-state', 'up');
      await expect(boardPage.row(KNOWN_ROWS.down[0])).toHaveAttribute('data-state', 'down');
    });

    test('@regression change and percent change are shown against the reference price', async ({ boardPage }) => {
      const { text } = expectedRow('FPT');
      await expect(boardPage.cell('FPT', 'chg')).toHaveText(text.chg);
      await expect(boardPage.cell('FPT', 'pct')).toHaveText(text.pct);
    });
  });

  test.describe('sorting', () => {
    test('@regression sorting by %Chg puts the biggest gainers first', async ({ boardPage }) => {
      await boardPage.sortBy('%Chg');
      await expect(boardPage.columnHeader('%Chg')).toHaveAttribute('aria-sort', 'descending');
      await expect(boardPage.tickers).toHaveText([...TICKERS_BY_PCT_DESC]);
    });

    test('@regression sorting by %Chg twice puts the biggest losers first', async ({ boardPage }) => {
      await boardPage.sortBy('%Chg');
      await boardPage.sortBy('%Chg');
      await expect(boardPage.columnHeader('%Chg')).toHaveAttribute('aria-sort', 'ascending');
      await expect(boardPage.tickers).toHaveText([...TICKERS_BY_PCT_ASC]);
    });

    test('@regression sorting by ticker twice reverses the alphabetical order', async ({ boardPage }) => {
      await boardPage.sortBy('Ticker');
      await boardPage.sortBy('Ticker');
      await expect(boardPage.columnHeader('Ticker')).toHaveAttribute('aria-sort', 'descending');
      await expect(boardPage.tickers).toHaveText([...VN30_TICKERS].reverse());
    });

    test('@regression only the sorted column reports an aria-sort direction', async ({ boardPage }) => {
      await boardPage.sortBy('Volume');
      await boardPage.sortBy('Ref');
      await expect(boardPage.columnHeader('Volume')).toHaveAttribute('aria-sort', 'none');
      await expect(boardPage.columnHeader('Ref')).toHaveAttribute('aria-sort', 'descending');
    });
  });

  test.describe('filtering', () => {
    test('@smoke searching by ticker narrows the board to that stock', async ({ boardPage }) => {
      await boardPage.searchFor('FPT');
      await expect(boardPage.rows).toHaveCount(1);
      await expect(boardPage.tickers).toHaveText(['FPT']);
    });

    test('@regression search is case-insensitive', async ({ boardPage }) => {
      await boardPage.searchFor('fpt');
      await expect(boardPage.tickers).toHaveText(['FPT']);
    });

    test('@regression search also matches company names', async ({ boardPage }) => {
      await boardPage.searchFor('vin');
      await expect(boardPage.tickers).toHaveText(['VHM', 'VIC', 'VNM', 'VRE']);
    });

    test('@regression a search without matches shows the empty state', async ({ boardPage }) => {
      await boardPage.searchFor('zzzz');
      await expect(boardPage.rows).toHaveCount(0);
      await expect(boardPage.emptyState).toHaveText('No stocks match your filters.');
    });

    test('@regression the result count follows the search', async ({ boardPage }) => {
      await expect(boardPage.resultCount).toHaveText('Showing 30 of 30 stocks');
      await boardPage.searchFor('FPT');
      await expect(boardPage.resultCount).toHaveText('Showing 1 of 30 stocks');
    });

    test('@smoke a sector chip filters the board to that sector', async ({ boardPage }) => {
      await boardPage.filterBySector('Banking');
      await expect(boardPage.sectorChip('Banking')).toHaveAttribute('aria-pressed', 'true');
      await expect(boardPage.tickers).toHaveText(stocksIn('Banking').map((s) => s.ticker));
    });

    test('@regression the All chip clears the sector filter', async ({ boardPage }) => {
      await boardPage.filterBySector('Energy');
      await boardPage.filterBySector('All');
      await expect(boardPage.rows).toHaveCount(30);
      await expect(boardPage.sectorChip('All')).toHaveAttribute('aria-pressed', 'true');
    });

    test('@regression search and sector chip combine', async ({ boardPage }) => {
      await boardPage.filterBySector('Real estate');
      await boardPage.searchFor('vin');
      await expect(boardPage.tickers).toHaveText(['VHM', 'VIC', 'VRE']);
    });

    test('@regression there is one chip per sector plus All', async ({ boardPage }) => {
      await expect(boardPage.sectorFilter.getByRole('button')).toHaveText(['All', ...SECTORS]);
    });
  });

  test.describe('watchlist stars', () => {
    test('@smoke the star adds a stock to the watchlist', async ({ boardPage }) => {
      await boardPage.addToWatchlist('ACB').click();
      await expect(boardPage.removeFromWatchlist('ACB')).toBeVisible();
    });

    test('@regression the star toggles back to remove the stock', async ({ boardPage }) => {
      await boardPage.addToWatchlist('ACB').click();
      await boardPage.removeFromWatchlist('ACB').click();
      await expect(boardPage.addToWatchlist('ACB')).toBeVisible();
    });

    test('@regression a starred stock stays starred after a reload', async ({ boardPage, page }) => {
      await boardPage.addToWatchlist('FPT').click();
      await page.reload();
      await expect(boardPage.removeFromWatchlist('FPT')).toBeVisible();
    });

    test('@regression starring a stock is announced politely', async ({ boardPage }) => {
      await boardPage.addToWatchlist('ACB').click();
      await expect(boardPage.liveRegion).toHaveText('ACB added to watchlist');
    });
  });

  test.describe('navigation', () => {
    test('@smoke clicking a row opens the stock detail page', async ({ boardPage, page }) => {
      await boardPage.openStock('VNM');
      await expect(page).toHaveURL(/\/demo\/stock\.html\?t=VNM/);
    });

    test('@regression the test-mode query travels with in-app links', async ({ boardPage, watchlistPage, page }) => {
      await boardPage.watchlistLink.click();
      await expect(page).toHaveURL(/\/demo\/watchlist\.html\?seed=42&frozen=1$/);
      await expect(watchlistPage.heading).toBeVisible();
    });
  });
});

test.describe('Market board (narrow screen)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('@regression the page itself does not scroll sideways at 375px', async ({ boardPage }) => {
    await boardPage.open();
    await expect(boardPage.rows).toHaveCount(30);
    await expect.poll(() => boardPage.hasHorizontalOverflow()).toBe(false);
  });
});

test.describe('Market board (live mode)', () => {
  test('@regression live prices keep changing without a reload', async ({ boardPage }) => {
    await boardPage.open(LIVE_QUERY);
    await expect(boardPage.mode).toHaveText('Live · simulated');
    await expect(boardPage.rows).toHaveCount(30);
    const before = (await boardPage.lastPrices.allTextContents()).join('|');
    // The simulation moves a few tickers every ~1.5 s, so poll (web-first) instead of sleeping.
    await expect.poll(async () => (await boardPage.lastPrices.allTextContents()).join('|')).not.toBe(before);
  });
});
