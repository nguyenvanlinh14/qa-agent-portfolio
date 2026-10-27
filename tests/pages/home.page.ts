import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly path = '/';

  readonly eyebrow: Locator;
  readonly heroTitle: Locator;
  readonly reportCta: Locator;
  readonly demoCta: Locator;
  readonly repoCta: Locator;
  readonly themeToggle: Locator;
  readonly agentLoop: Locator;
  readonly stats: Locator;
  readonly pipeline: Locator;
  readonly lessonCards: Locator;
  readonly ossBlock: Locator;
  readonly contributions: Locator;
  readonly contributionCards: Locator;
  readonly services: Locator;
  readonly serviceTiles: Locator;
  readonly workCta: Locator;
  readonly githubCta: Locator;

  constructor(page: Page) {
    super(page);
    this.eyebrow = page.getByTestId('hero-eyebrow');
    this.heroTitle = page.getByTestId('hero-title');
    this.reportCta = page.getByTestId('cta-report');
    this.demoCta = page.getByTestId('cta-demo');
    this.repoCta = page.getByTestId('cta-repo');
    this.themeToggle = page.getByTestId('theme-toggle');
    this.agentLoop = page.getByTestId('agent-loop');
    this.stats = page.getByTestId('stats');
    this.pipeline = page.getByTestId('pipeline');
    this.lessonCards = page.getByTestId('lesson-card');
    this.ossBlock = page.getByTestId('oss-issues');
    this.contributions = page.getByTestId('oss-contributions');
    this.contributionCards = page.getByTestId('contribution');
    this.services = page.getByTestId('services');
    this.serviceTiles = page.getByTestId('service-tile');
    this.workCta = page.getByTestId('cta-work');
    this.githubCta = page.getByTestId('cta-github');
  }

  /** The card for one contribution, found by its "owner/repo#number" label. */
  contributionCard(repo: string, issue: number): Locator {
    return this.contributionCards.filter({ hasText: `${repo}#${issue}` });
  }

  contributionTrackSteps(card: Locator): Locator {
    return card.getByRole('listitem');
  }

  contributionLink(card: Locator, name: 'Issue' | 'Draft' | 'Run' | 'PR'): Locator {
    return card.getByRole('link', { name, exact: true });
  }

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
