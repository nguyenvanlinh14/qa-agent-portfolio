import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/** The tiny hook assets/fx.js exposes on window so a spec can tell a static frame from a running loop. */
export interface ParticlesState {
  running: boolean;
  mode: 'live' | 'static';
  frames: number;
  count: number;
}

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
  readonly hero: Locator;
  readonly particles: Locator;
  readonly isoStack: Locator;
  readonly isoLayers: Locator;
  readonly isoPackets: Locator;
  readonly blueprintPanel: Locator;
  readonly blueprintStrokes: Locator;

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
    this.hero = page.getByRole('banner');
    this.particles = page.getByTestId('hero-particles');
    this.isoStack = page.getByTestId('iso-stack');
    this.isoLayers = this.isoStack.getByTestId('iso-layer');
    // The packets are plain <g> elements inside an aria-hidden SVG: no role, label or test id applies.
    this.isoPackets = this.isoStack.locator('.pkt');
    this.blueprintPanel = this.workflowSection.getByTestId('blueprint-panel');
    // Drawn-in strokes are SVG paths without any accessible name.
    this.blueprintStrokes = this.blueprintPanel.locator('.bp-stroke');
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

  /** One layer of the isometric stack, found by its label. */
  isoLayer(name: string): Locator {
    return this.isoLayers.filter({ hasText: name });
  }

  /** The hook from assets/fx.js; null when the script did not run. */
  async particlesState(): Promise<ParticlesState | null> {
    return this.page.evaluate(() => (window as unknown as { __particles?: ParticlesState }).__particles ?? null);
  }

  /** True when the canvas box equals the hero box (within 1px) and its backing store matches that box at the capped DPR. */
  async particlesFitHero(): Promise<boolean> {
    return this.page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas.particles');
      const hero = canvas?.parentElement;
      if (!canvas || !hero) return false;
      const c = canvas.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const close = (a: number, b: number) => Math.abs(a - b) <= 1;
      return (
        close(c.width, h.width) &&
        close(c.height, h.height) &&
        close(canvas.width, h.width * dpr) &&
        close(canvas.height, h.height * dpr)
      );
    });
  }

  /** Number of canvas pixels that are not fully transparent. */
  async particlesPaintedPixels(): Promise<number> {
    return this.page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas.particles');
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) painted++;
      return painted;
    });
  }

  /** The canvas bitmap as a data URL, to compare two loads pixel for pixel. */
  async particlesBitmap(): Promise<string> {
    return this.page.evaluate(() => document.querySelector<HTMLCanvasElement>('canvas.particles')?.toDataURL() ?? '');
  }
}
