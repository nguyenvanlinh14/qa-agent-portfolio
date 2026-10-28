import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { EVIDENCE_PATH } from '../data/live';

/** Bug evidence gallery (site/evidence/): one video + bug report per unique bug. */
export class EvidencePage extends BasePage {
  readonly path = EVIDENCE_PATH;

  readonly heading: Locator;
  readonly entries: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Bug evidence', level: 1 });
    this.entries = page.getByTestId('evidence');
  }

  entry(id: string): Locator {
    return this.page.locator(`[data-testid="evidence"][data-id="${id}"]`);
  }

  video(id: string): Locator {
    return this.entry(id).getByTestId('evidence-video');
  }

  captions(id: string): Locator {
    return this.video(id).locator('track[kind="captions"]');
  }

  reportRow(id: string, name: string): Locator {
    return this.entry(id).getByTestId('evidence-report').getByRole('row').filter({ has: this.page.getByRole('rowheader', { name, exact: true }) });
  }
}
