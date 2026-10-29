import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/** The top bar every page shares: the site name and the LinkedIn link (the live page has its own header). */
export class SiteNavPage extends BasePage {
  path = '/';

  readonly linkedIn: Locator;

  constructor(page: Page) {
    super(page);
    // Icon-only on phones, so it is found by its test id; its accessible name comes from aria-label.
    this.linkedIn = page.getByTestId('nav-linkedin');
  }

  async open(path: string): Promise<void> {
    this.path = path;
    await this.goto();
  }

  brand(name: string): Locator {
    return this.page.getByRole('link', { name, exact: true });
  }
}
