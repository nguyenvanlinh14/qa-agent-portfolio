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
  readonly footerLinkedIn: Locator;
  readonly workflowSection: Locator;
  readonly workflowHeading: Locator;
  readonly workflows: Locator;
  readonly workflowStats: Locator;
  readonly caseStudyCta: Locator;
  readonly navWorkflowLink: Locator;

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
    this.footerLinkedIn = page.getByRole('contentinfo').getByRole('link', { name: 'LinkedIn' });
    this.workflowSection = page.getByTestId('agent-workflow');
    this.workflowHeading = this.workflowSection.getByRole('heading', { level: 2, name: 'Agents in production' });
    this.workflows = this.workflowSection.getByTestId('workflow');
    this.workflowStats = this.workflowSection.getByTestId('workflow-stats');
    this.caseStudyCta = page.getByTestId('cta-case-study');
    this.navWorkflowLink = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Workflow', exact: true });
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

  /** The workflow card (A, B or C) found by its title, e.g. "Build the suite". */
  workflow(title: string): Locator {
    return this.workflows.filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
  }

  /** A lane inside one workflow card. Its tag is visually hidden on desktop, so it is counted, not asserted visible. */
  lane(card: Locator, name: string): Locator {
    return card.getByText(name, { exact: true });
  }

  /** One headline figure tile, found by its label. */
  workflowStat(label: string): Locator {
    return this.workflowStats.getByTestId('workflow-stat').filter({ hasText: label });
  }

  /** Top edge (px) of every workflow card, to tell side-by-side from stacked. */
  async workflowTops(): Promise<number[]> {
    return this.workflows.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  }
}
