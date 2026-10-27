import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CvPage extends BasePage {
  readonly path = '/cv.html';

  readonly cv: Locator;
  readonly summary: Locator;
  readonly skills: Locator;
  readonly openSource: Locator;
  readonly contact: Locator;
  readonly printButton: Locator;
  /** mailto: / tel: links have no role-based locator; the href prefix is the only way to find them. */
  readonly emailOrPhoneLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.cv = page.getByTestId('cv');
    this.summary = page.getByTestId('cv-summary');
    this.skills = page.getByTestId('cv-skills');
    this.openSource = page.getByTestId('cv-oss');
    this.contact = page.getByTestId('cv-contact');
    this.printButton = page.getByRole('button', { name: 'Download PDF' });
    this.emailOrPhoneLinks = page.locator('a[href^="mailto:" i], a[href^="tel:" i]');
  }

  skill(name: string): Locator {
    return this.skills.getByRole('listitem').filter({ hasText: name });
  }
}
