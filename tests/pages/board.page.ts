import type { Locator, Page } from '@playwright/test';
import { MarketPage } from './market.page';
import type { Sector } from '../data/market';

export type BoardColumn = 'Ticker' | 'Ref' | 'Ceil' | 'Floor' | 'Last' | 'Chg' | '%Chg' | 'Volume' | 'Bid' | 'Ask';
export type BoardCell = 'ref' | 'ceil' | 'floor' | 'last' | 'chg' | 'pct' | 'volume' | 'bid' | 'ask';

export class BoardPage extends MarketPage {
  readonly path = '/demo/board.html';

  readonly heading: Locator;
  readonly indexHeading: Locator;
  readonly indexValue: Locator;
  readonly indexChange: Locator;
  readonly advancing: Locator;
  readonly declining: Locator;
  readonly unchanged: Locator;
  readonly mode: Locator;
  readonly search: Locator;
  readonly sectorFilter: Locator;
  readonly resultCount: Locator;
  readonly emptyState: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly tickers: Locator;
  readonly lastPrices: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Market board', level: 1 });
    this.indexHeading = page.getByRole('heading', { name: 'VN30 (simulated)' });
    this.indexValue = page.getByTestId('index-value');
    this.indexChange = page.getByTestId('index-change');
    this.advancing = page.getByTestId('breadth-up');
    this.declining = page.getByTestId('breadth-down');
    this.unchanged = page.getByTestId('breadth-flat');
    this.mode = page.getByTestId('market-mode');
    this.search = page.getByLabel('Search ticker or name');
    this.sectorFilter = page.getByRole('group', { name: 'Sector filter' });
    this.resultCount = page.getByTestId('result-count');
    this.emptyState = page.getByTestId('empty-state');
    this.table = page.getByRole('table', { name: 'VN30 constituents with simulated prices' });
    // Data rows are the rows that contain cells (the header row only has column headers). Hidden rows are excluded.
    this.rows = this.table.getByRole('row').filter({ has: page.getByRole('cell') });
    this.tickers = this.rows.getByRole('link');
    this.lastPrices = this.table.getByTestId('last');
  }

  row(ticker: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name: ticker, exact: true }) });
  }

  cell(ticker: string, cell: BoardCell): Locator {
    return this.row(ticker).getByTestId(cell);
  }

  columnHeader(column: BoardColumn): Locator {
    return this.table.getByRole('columnheader', { name: column, exact: true });
  }

  async sortBy(column: BoardColumn): Promise<void> {
    await this.columnHeader(column).getByRole('button').click();
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
  }

  sectorChip(name: Sector | 'All'): Locator {
    return this.sectorFilter.getByRole('button', { name, exact: true });
  }

  async filterBySector(name: Sector | 'All'): Promise<void> {
    await this.sectorChip(name).click();
  }

  addToWatchlist(ticker: string): Locator {
    return this.row(ticker).getByRole('button', { name: `Add ${ticker} to watchlist` });
  }

  removeFromWatchlist(ticker: string): Locator {
    return this.row(ticker).getByRole('button', { name: `Remove ${ticker} from watchlist` });
  }

  /** Clicks a plain data cell: the whole row is a click target for the detail page. */
  async openStock(ticker: string): Promise<void> {
    await this.cell(ticker, 'volume').click();
  }
}
