import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { FROZEN_QUERY } from '../data/market';

/** Shared shell of every signed-in MarketFlow page: nav, user, sign out, disclaimer, live region, toasts. */
export abstract class MarketPage extends BasePage {
  readonly nav: Locator;
  readonly boardLink: Locator;
  readonly watchlistLink: Locator;
  readonly screenerLink: Locator;
  readonly currentUser: Locator;
  readonly signOut: Locator;
  readonly themeToggle: Locator;
  readonly disclaimer: Locator;
  readonly liveRegion: Locator;
  readonly toasts: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.boardLink = this.nav.getByRole('link', { name: 'Board' });
    this.watchlistLink = this.nav.getByRole('link', { name: 'Watchlist' });
    this.screenerLink = this.nav.getByRole('link', { name: 'Screener' });
    this.currentUser = page.getByTestId('current-user');
    this.signOut = page.getByRole('button', { name: 'Sign out' });
    this.themeToggle = page.getByRole('button', { name: 'Toggle light or dark theme' });
    this.disclaimer = page.getByTestId('disclaimer');
    this.liveRegion = page.getByRole('status', { name: 'Status updates' });
    this.toasts = page.getByRole('status', { name: 'Alert notifications' });
  }

  /** Opens the page; the default is the deterministic frozen snapshot (`?seed=42&frozen=1`). Pass '' for live mode. */
  async open(query: string = FROZEN_QUERY): Promise<void> {
    await this.page.goto(`${this.path}${query}`);
  }
}
