import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/** Tess, the voiced tour on the homepage: the floating launcher and the tour panel it opens. */
export class GuidePage extends BasePage {
  readonly path = '/';

  readonly launcher: Locator;
  readonly panel: Locator;
  readonly name: Locator;
  readonly stepCount: Locator;
  readonly stepTitle: Locator;
  readonly caption: Locator;
  readonly prev: Locator;
  readonly next: Locator;
  readonly play: Locator;
  readonly sound: Locator;
  readonly close: Locator;
  readonly stops: Locator;
  /** The homepage section the guide is talking about. */
  readonly focusedSection: Locator;
  /** The "Click me" bubble next to the launcher. */
  readonly hint: Locator;
  readonly hintOpen: Locator;
  readonly hintClose: Locator;

  constructor(page: Page) {
    super(page);
    this.launcher = page.getByRole('button', { name: 'Open the portfolio guide' });
    this.panel = page.getByRole('dialog', { name: 'Tess' });
    this.name = this.panel.getByTestId('guide-name');
    this.stepCount = this.panel.getByTestId('guide-step-count');
    this.stepTitle = this.panel.getByTestId('guide-step-title');
    this.caption = this.panel.getByTestId('guide-caption');
    this.prev = this.panel.getByRole('button', { name: 'Previous stop' });
    this.next = this.panel.getByRole('button', { name: 'Next stop' });
    this.play = this.panel.getByTestId('guide-play');
    this.sound = this.panel.getByRole('button', { name: 'Voice' });
    this.close = this.panel.getByRole('button', { name: 'Close the guide' });
    this.stops = this.panel.getByRole('navigation', { name: 'Tour stops' }).getByRole('button');
    // The highlight is a data attribute on whichever section is current; no role or label names "current section".
    this.focusedSection = page.locator('[data-guide-focus]');
    this.hint = page.getByTestId('guide-hint');
    this.hintOpen = this.hint.getByTestId('guide-hint-open');
    this.hintClose = this.hint.getByRole('button', { name: 'Hide the tour hint' });
  }

  /** Opens the homepage with the guide already open, through the shareable #tour link. */
  async gotoTour(): Promise<void> {
    await this.page.goto(`${this.path}#tour`);
  }

  async open(): Promise<void> {
    await this.launcher.click();
  }

  language(lang: string): Locator {
    return this.panel.getByRole('group', { name: 'Language' }).getByRole('button', { name: lang.toUpperCase(), exact: true });
  }

  stop(title: string): Locator {
    return this.stops.filter({ hasText: title });
  }
}
