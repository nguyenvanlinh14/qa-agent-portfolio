import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CaseStudyPage extends BasePage {
  readonly path = '/case-study.html';

  readonly article: Locator;
  readonly title: Locator;
  readonly context: Locator;
  readonly results: Locator;
  readonly stats: Locator;
  readonly workflowTables: Locator;
  readonly stampMocks: Locator;
  readonly note: Locator;
  /** mailto: / tel: links have no role-based locator; the href prefix is the only way to find them. */
  readonly emailOrPhoneLinks: Locator;
  /** Raster images would be screenshots from the project; the page may only contain drawn SVG. getByRole('img') also matches SVGs, so the tag is the only way. */
  readonly rasterImages: Locator;

  constructor(page: Page) {
    super(page);
    this.article = page.getByTestId('case-study');
    this.title = page.getByTestId('case-title');
    this.context = page.getByTestId('case-context');
    this.results = page.getByTestId('case-results');
    this.stats = page.getByTestId('case-stats');
    this.workflowTables = this.article.getByRole('table');
    this.stampMocks = page.getByTestId('stamp-mock');
    this.note = page.getByTestId('case-note');
    this.emailOrPhoneLinks = page.locator('a[href^="mailto:" i], a[href^="tel:" i]');
    this.rasterImages = this.article.locator('img');
  }

  /** A top-level section heading (h2). */
  sectionHeading(name: string): Locator {
    return this.article.getByRole('heading', { level: 2, name, exact: true });
  }

  /** One headline figure tile, found by its label. */
  stat(label: string): Locator {
    return this.stats.getByTestId('case-stat').filter({ hasText: label });
  }
}
