import type { Locator, Page } from '@playwright/test';
import { MarketPage } from './market.page';
import { FROZEN_QUERY } from '../data/market';
import type { AlertInput } from '../data/alert-builder';

export type StockStat = 'ref' | 'ceil' | 'floor' | 'pe' | 'mcap' | 'sector' | 'volume' | 'bid' | 'ask';

export class StockPage extends MarketPage {
  readonly path = '/demo/stock.html';

  readonly ticker: Locator;
  readonly companyName: Locator;
  readonly last: Locator;
  readonly change: Locator;
  readonly state: Locator;
  readonly addToWatchlist: Locator;
  readonly removeFromWatchlist: Locator;
  readonly chart: Locator;
  readonly candles: Locator;
  readonly condition: Locator;
  readonly alertPrice: Locator;
  readonly addAlert: Locator;
  readonly alertError: Locator;
  readonly alerts: Locator;
  readonly noAlerts: Locator;
  readonly notFoundHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.ticker = page.getByRole('heading', { level: 1 });
    this.companyName = page.getByTestId('stock-name');
    this.last = page.getByTestId('stock-last');
    this.change = page.getByTestId('stock-change');
    this.state = page.getByTestId('stock-state');
    this.addToWatchlist = page.getByRole('button', { name: 'Add to watchlist' });
    this.removeFromWatchlist = page.getByRole('button', { name: 'Remove from watchlist' });
    this.chart = page.getByRole('img', { name: /Candlestick chart/ });
    this.candles = this.chart.getByTestId('candle');
    this.condition = page.getByLabel('Condition');
    this.alertPrice = page.getByLabel('Alert price');
    this.addAlert = page.getByRole('button', { name: 'Add alert' });
    this.alertError = page.getByRole('alert');
    this.alerts = page.getByRole('list', { name: /^Alerts for / }).getByRole('listitem');
    this.noAlerts = page.getByTestId('alerts-empty');
    this.notFoundHeading = page.getByRole('heading', { name: 'Ticker not found' });
  }

  /** Opens `stock.html?t=<ticker>` in the frozen snapshot by default. */
  async openTicker(ticker: string, query: string = FROZEN_QUERY): Promise<void> {
    const extra = query.startsWith('?') ? `&${query.slice(1)}` : query;
    await this.page.goto(`${this.path}?t=${ticker}${extra}`);
  }

  stat(name: StockStat): Locator {
    return this.page.getByTestId(`stat-${name}`);
  }

  async setAlert({ direction, price }: AlertInput): Promise<void> {
    await this.condition.selectOption(direction);
    await this.alertPrice.fill(price);
    await this.addAlert.click();
  }

  deleteAlert(label: string): Locator {
    return this.page.getByRole('button', { name: `Delete alert ${label}`, exact: true });
  }
}
