import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  /** Path relative to baseURL, e.g. '/' or '/demo/'. */
  abstract readonly path: string;

  constructor(protected readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  get html(): Locator {
    return this.page.locator('html');
  }
}
