import { test, expect } from '../fixtures';
import { DISCLAIMER, SEED_42_ROWS, VN30, VN30_TICKERS, displayedPct, stocksIn } from '../data/market';

const tickersOf = (stocks: readonly { ticker: string }[]): string[] => stocks.map((s) => s.ticker);

test.describe('Screener', () => {
  test.beforeEach(async ({ screenerPage }) => {
    await screenerPage.open();
  });

  test('@smoke shows all 30 stocks before any filter is set', async ({ screenerPage }) => {
    await expect(screenerPage.heading).toBeVisible();
    await expect(screenerPage.resultCount).toHaveText('30 results');
    await expect(screenerPage.tickers).toHaveText([...VN30_TICKERS]);
  });

  test('@smoke the sector filter narrows the results', async ({ screenerPage }) => {
    await screenerPage.pickSector('Banking');
    await expect(screenerPage.tickers).toHaveText(tickersOf(stocksIn('Banking')));
    await expect(screenerPage.resultCount).toHaveText(`${stocksIn('Banking').length} results`);
  });

  test('@regression P/E max keeps stocks at or below the limit', async ({ screenerPage }) => {
    await screenerPage.peMax.fill('8');
    await expect(screenerPage.tickers).toHaveText(tickersOf(VN30.filter((s) => s.pe <= 8)));
  });

  test('@regression market cap min keeps stocks at or above the limit', async ({ screenerPage }) => {
    await screenerPage.marketCapMin.fill('200000');
    await expect(screenerPage.tickers).toHaveText(tickersOf(VN30.filter((s) => s.mcap >= 200000)));
  });

  test('@regression %Chg min keeps stocks that rose at least that much', async ({ screenerPage }) => {
    await screenerPage.pctMin.fill('5');
    await expect(screenerPage.tickers).toHaveText(tickersOf(SEED_42_ROWS.filter((r) => displayedPct(r.ticker) >= 5)));
  });

  test('@regression %Chg max keeps stocks that fell or rose less than that', async ({ screenerPage }) => {
    await screenerPage.pctMax.fill('-5');
    await expect(screenerPage.tickers).toHaveText(tickersOf(SEED_42_ROWS.filter((r) => displayedPct(r.ticker) <= -5)));
  });

  test('@regression filters combine with AND', async ({ screenerPage }) => {
    await screenerPage.pickSector('Banking');
    await screenerPage.peMax.fill('9');
    await screenerPage.pctMin.fill('0');
    const expected = VN30.filter((s) => s.sector === 'Banking' && s.pe <= 9 && displayedPct(s.ticker) >= 0);
    await expect(screenerPage.tickers).toHaveText(tickersOf(expected));
  });

  test('@regression filters that match nothing show the empty state', async ({ screenerPage }) => {
    await screenerPage.peMax.fill('1');
    await expect(screenerPage.resultCount).toHaveText('0 results');
    await expect(screenerPage.emptyState).toHaveText('No stocks match these filters.');
  });

  test('@regression one result is counted in the singular', async ({ screenerPage }) => {
    await screenerPage.pickSector('Technology');
    await expect(screenerPage.resultCount).toHaveText('1 result');
  });

  test('@regression a %Chg range with min above max is flagged', async ({ screenerPage }) => {
    await screenerPage.pctMin.fill('3');
    await screenerPage.pctMax.fill('1');
    await expect(screenerPage.rangeNote).toBeVisible();
    await expect(screenerPage.resultCount).toHaveText('0 results');
  });

  test('@smoke Reset filters brings back all 30 stocks', async ({ screenerPage }) => {
    await screenerPage.pickSector('Energy');
    await screenerPage.peMax.fill('10');
    await screenerPage.reset.click();
    await expect(screenerPage.rows).toHaveCount(30);
    await expect(screenerPage.resultCount).toHaveText('30 results');
  });

  test('@regression Reset filters clears every field', async ({ screenerPage }) => {
    await screenerPage.pickSector('Energy');
    await screenerPage.peMax.fill('10');
    await screenerPage.marketCapMin.fill('1000');
    await screenerPage.pctMin.fill('-3');
    await screenerPage.pctMax.fill('3');
    await screenerPage.reset.click();
    await expect(screenerPage.sector).toHaveValue('');
    await expect(screenerPage.peMax).toHaveValue('');
    await expect(screenerPage.marketCapMin).toHaveValue('');
    await expect(screenerPage.pctMin).toHaveValue('');
    await expect(screenerPage.pctMax).toHaveValue('');
  });

  test('@regression the nav marks the screener as the current page and shows the disclaimer', async ({ screenerPage }) => {
    await expect(screenerPage.screenerLink).toHaveAttribute('aria-current', 'page');
    await expect(screenerPage.disclaimer).toHaveText(DISCLAIMER);
  });
});
