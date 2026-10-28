import type { Locator, Page } from '@playwright/test';
import { MarketPage } from './market.page';
import { FROZEN_QUERY, watchlistKey } from '../data/market';

export class WatchlistPage extends MarketPage {
  readonly path = '/demo/watchlist.html';

  readonly heading: Locator;
  readonly count: Locator;
  readonly emptyState: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly tickers: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Watchlist', level: 1 });
    this.count = page.getByTestId('watchlist-count');
    this.emptyState = page.getByTestId('empty-state');
    this.table = page.getByRole('table', { name: 'Your watchlist with simulated prices' });
    this.rows = this.table.getByRole('row').filter({ has: page.getByRole('cell') });
    this.tickers = this.rows.getByRole('link');
  }

  row(ticker: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name: ticker, exact: true }) });
  }

  remove(ticker: string): Locator {
    return this.row(ticker).getByRole('button', { name: `Remove ${ticker} from watchlist` });
  }

  /** Opens the page with `tickers` already on the signed-in user's watchlist (the demo keeps it in localStorage). */
  async openWith(email: string, tickers: readonly string[], query: string = FROZEN_QUERY): Promise<void> {
    await this.open(query);
    await this.page.evaluate(([key, value]) => localStorage.setItem(key, value), [watchlistKey(email), JSON.stringify(tickers)] as const);
    await this.page.reload();
  }
}
