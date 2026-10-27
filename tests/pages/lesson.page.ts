import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LessonPage extends BasePage {
  readonly path = '/lessons/';

  readonly content: Locator;
  readonly nextLink: Locator;
  readonly prevLink: Locator;

  constructor(page: Page) {
    super(page);
    this.content = page.getByTestId('lesson-content');
    // The prev/next links carry arrows in their text: "← title" / "title →".
    this.nextLink = page.getByRole('link', { name: /→/ });
    this.prevLink = page.getByRole('link', { name: /←/ });
  }
}
