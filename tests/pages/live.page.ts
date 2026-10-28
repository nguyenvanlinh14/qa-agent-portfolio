import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { LIVE_PATH } from '../data/live';

/** The live test-run dashboard (site/live/), opened in replay mode on a recorded run. */
export class LivePage extends BasePage {
  readonly path = LIVE_PATH;

  readonly mode: Locator;
  readonly source: Locator;
  readonly progress: Locator;
  readonly done: Locator;
  readonly total: Locator;
  readonly passed: Locator;
  readonly failed: Locator;
  readonly flaky: Locator;
  readonly skipped: Locator;
  readonly running: Locator;
  readonly failures: Locator;
  readonly noFailures: Locator;
  readonly projectRows: Locator;
  readonly finished: Locator;
  readonly speed: Locator;
  readonly replayButton: Locator;
  readonly browserUrl: Locator;
  readonly browserFrame: Locator;
  readonly browserStatus: Locator;

  constructor(page: Page) {
    super(page);
    this.mode = page.getByTestId('live-mode');
    this.source = page.getByTestId('live-source');
    this.progress = page.getByRole('progressbar', { name: 'Tests finished' });
    this.done = page.getByTestId('live-done');
    this.total = page.getByTestId('live-total');
    this.passed = page.getByTestId('count-passed');
    this.failed = page.getByTestId('count-failed');
    this.flaky = page.getByTestId('count-flaky');
    this.skipped = page.getByTestId('count-skipped');
    this.running = page.getByTestId('count-running');
    this.failures = page.getByTestId('failures').getByRole('listitem');
    this.noFailures = page.getByTestId('no-failures');
    this.projectRows = page.getByTestId('projects').locator('tbody').getByRole('row');
    this.finished = page.getByTestId('finished').getByRole('listitem');
    this.speed = page.getByLabel('Replay speed');
    this.replayButton = page.getByRole('button', { name: 'Replay' });
    this.browserUrl = page.getByTestId('browser-url');
    this.browserFrame = page.getByTestId('browser-frame');
    this.browserStatus = page.getByTestId('browser-status');
  }

  /** Replays `src` at `speed` (a number, or 'max' to jump straight to the final state). */
  async replay(src: string, speed: string = 'max'): Promise<void> {
    await this.page.goto(`${this.path}?src=${encodeURIComponent(src)}&speed=${speed}`);
  }

  projectRow(name: string): Locator {
    return this.projectRows.filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }
}
