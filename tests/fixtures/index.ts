import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { A11Y_TAGS } from '../data/a11y';
import { LIVE_FRAMES_RAW } from '../data/live';
import { ApiClient } from './api-client';
import { users } from '../data/factories';
import { BoardPage, CaseStudyPage, CvPage, EvidencePage, GuidePage, HomePage, LessonPage, LivePage, LoginPage, ScreenerPage, SiteNavPage, StockPage, WatchlistPage } from '../pages';

interface Fixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  boardPage: BoardPage;
  watchlistPage: WatchlistPage;
  screenerPage: ScreenerPage;
  stockPage: StockPage;
  lessonPage: LessonPage;
  cvPage: CvPage;
  caseStudyPage: CaseStudyPage;
  livePage: LivePage;
  evidencePage: EvidencePage;
  guidePage: GuidePage;
  siteNav: SiteNavPage;
  /** axe-core scan of the current page, limited to WCAG 2.1 A/AA rules. */
  axe: () => AxeBuilder;
  /** Anonymous API client (no token). */
  api: ApiClient;
  /** API client signed in as qa@demo.dev. */
  qaApi: ApiClient;
  /** API client signed in as dev@demo.dev. */
  devApi: ApiClient;
}

export const test = base.extend<Fixtures>({
  // After each UI test, one small screenshot of the page and its exact URL for the live dashboard's browser view.
  // Written straight to reports/live-frames/raw/ (not attached, so the HTML / JSON reports stay small);
  // reporters/live-reporter.ts picks them up. LIVE_FRAMES=0 turns it off.
  page: async ({ page }, use, testInfo) => {
    await use(page);
    if (testInfo.project.name !== 'ui' || process.env.LIVE_FRAMES === '0' || page.isClosed()) return;
    const base = join(LIVE_FRAMES_RAW, `${testInfo.testId}-${testInfo.retry}`);
    mkdirSync(LIVE_FRAMES_RAW, { recursive: true });
    const shot = await page.screenshot({ type: 'jpeg', quality: 45, path: `${base}.jpg` }).catch(() => null);
    if (shot) writeFileSync(`${base}.url`, page.url());
  },
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  boardPage: async ({ page }, use) => use(new BoardPage(page)),
  watchlistPage: async ({ page }, use) => use(new WatchlistPage(page)),
  screenerPage: async ({ page }, use) => use(new ScreenerPage(page)),
  stockPage: async ({ page }, use) => use(new StockPage(page)),
  lessonPage: async ({ page }, use) => use(new LessonPage(page)),
  cvPage: async ({ page }, use) => use(new CvPage(page)),
  caseStudyPage: async ({ page }, use) => use(new CaseStudyPage(page)),
  livePage: async ({ page }, use) => use(new LivePage(page)),
  evidencePage: async ({ page }, use) => use(new EvidencePage(page)),
  guidePage: async ({ page }, use) => use(new GuidePage(page)),
  siteNav: async ({ page }, use) => use(new SiteNavPage(page)),
  axe: async ({ page }, use) => use(() => new AxeBuilder({ page }).withTags([...A11Y_TAGS])),
  api: async ({ request }, use) => use(new ApiClient(request)),
  qaApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.qa)),
  devApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.dev)),
});

export { expect };
export { unwrap } from './api-client';
export type { Todo } from './api-client';
