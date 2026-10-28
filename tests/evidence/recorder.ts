import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface EvidenceStep {
  key: string;
  card: string;
  say: string;
  kind?: 'actual' | 'expected';
}
export interface EvidenceScript {
  id: string;
  title: string;
  defect?: string;
  steps: EvidenceStep[];
}
interface Narration {
  clips: { key: string; ms: number }[];
}
export interface TimelineStep {
  key: string;
  start: number;
  end: number;
}

export const VIDEO_SIZE = { width: 1280, height: 720 } as const;
/** Silence after each narration clip, so sentences do not run into each other. */
const GAP_MS = 500;

/**
 * Records one evidence video: a fresh browser context with video on, one `step()` per sentence of the narration.
 * Each step is held on screen at least as long as its narration clip (evidence/out/<id>/narration.json), and the
 * real start / end of every step is written to timeline.json for the subtitle builder.
 *
 * Pacing exception: holding a step with a timed wait is allowed here (and only here). It paces a recording for a
 * viewer; it never synchronises the test with the app.
 */
export class EvidenceRecorder {
  readonly script: EvidenceScript;
  readonly dir: string;
  private readonly clipMs: Map<string, number>;
  private readonly timeline: TimelineStep[] = [];
  private context?: BrowserContext;
  private t0 = 0;
  page!: Page;

  constructor(scriptFile: string) {
    this.script = JSON.parse(readFileSync(scriptFile, 'utf8')) as EvidenceScript;
    this.dir = join('evidence', 'out', this.script.id);
    const narration = JSON.parse(readFileSync(join(this.dir, 'narration.json'), 'utf8')) as Narration;
    this.clipMs = new Map(narration.clips.map((c) => [c.key, c.ms]));
  }

  async open(browser: Browser): Promise<Page> {
    mkdirSync(this.dir, { recursive: true });
    this.context = await browser.newContext({
      viewport: VIDEO_SIZE,
      colorScheme: 'dark',
      recordVideo: { dir: join(this.dir, 'raw'), size: VIDEO_SIZE },
    });
    this.page = await this.context.newPage();
    // The video starts with the page; step times are measured from here.
    this.t0 = Date.now();
    return this.page;
  }

  /** Runs `actions` as one narrated step, then holds the screen until the sentence has been read. */
  async step(key: string, actions: () => Promise<void> = async () => {}): Promise<void> {
    const want = this.clipMs.get(key);
    if (want === undefined) throw new Error(`step "${key}" has no narration clip — run scripts/evidence/narrate.mjs first`);
    const start = Date.now() - this.t0;
    await actions();
    const left = start + want + GAP_MS - (Date.now() - this.t0);
    if (left > 0) await this.page.waitForTimeout(left);
    this.timeline.push({ key, start, end: Date.now() - this.t0 });
  }

  /** Red outline on the element the next action is about, so a viewer can follow the click. */
  async spotlight(target: Locator): Promise<void> {
    await target.evaluate((el: HTMLElement) => {
      el.style.outline = '3px solid #ff3b5c';
      el.style.outlineOffset = '3px';
    });
  }

  /** Closes the context (which finalises the video) and writes video.webm + timeline.json. */
  async finish(): Promise<string> {
    const video = this.page.video();
    await this.context?.close();
    const out = join(this.dir, 'video.webm');
    if (video) renameSync(await video.path(), out);
    writeFileSync(join(this.dir, 'timeline.json'), JSON.stringify({ id: this.script.id, size: VIDEO_SIZE, steps: this.timeline }, null, 2));
    return out;
  }
}
