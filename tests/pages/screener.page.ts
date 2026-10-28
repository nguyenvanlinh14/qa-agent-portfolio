import type { Locator, Page } from '@playwright/test';
import { MarketPage } from './market.page';
import type { Sector } from '../data/market';

export class ScreenerPage extends MarketPage {
  readonly path = '/demo/screener.html';

  readonly heading: Locator;
  readonly sector: Locator;
  readonly peMax: Locator;
  readonly marketCapMin: Locator;
  readonly pctMin: Locator;
  readonly pctMax: Locator;
  readonly reset: Locator;
  readonly rangeNote: Locator;
  readonly resultCount: Locator;
  readonly emptyState: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly tickers: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Screener', level: 1 });
    this.sector = page.getByLabel('Sector');
    this.peMax = page.getByLabel('P/E max');
    this.marketCapMin = page.getByLabel('Market cap min (VND bn)');
    this.pctMin = page.getByLabel('%Chg min');
    this.pctMax = page.getByLabel('%Chg max');
    this.reset = page.getByRole('button', { name: 'Reset filters' });
    this.rangeNote = page.getByRole('note');
    this.resultCount = page.getByTestId('result-count');
    this.emptyState = page.getByTestId('empty-state');
    this.table = page.getByRole('table', { name: 'Screener results' });
    this.rows = this.table.getByRole('row').filter({ has: page.getByRole('cell') });
    this.tickers = this.rows.getByRole('link');
  }

  async pickSector(sector: Sector): Promise<void> {
    await this.sector.selectOption(sector);
  }
}
