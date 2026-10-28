import { test as base, expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { users } from '../data/factories';
import { BoardPage, CaseStudyPage, CvPage, HomePage, LessonPage, LoginPage, ScreenerPage, StockPage, WatchlistPage } from '../pages';

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
  /** Anonymous API client (no token). */
  api: ApiClient;
  /** API client signed in as qa@demo.dev. */
  qaApi: ApiClient;
  /** API client signed in as dev@demo.dev. */
  devApi: ApiClient;
}

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  boardPage: async ({ page }, use) => use(new BoardPage(page)),
  watchlistPage: async ({ page }, use) => use(new WatchlistPage(page)),
  screenerPage: async ({ page }, use) => use(new ScreenerPage(page)),
  stockPage: async ({ page }, use) => use(new StockPage(page)),
  lessonPage: async ({ page }, use) => use(new LessonPage(page)),
  cvPage: async ({ page }, use) => use(new CvPage(page)),
  caseStudyPage: async ({ page }, use) => use(new CaseStudyPage(page)),
  api: async ({ request }, use) => use(new ApiClient(request)),
  qaApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.qa)),
  devApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.dev)),
});

export { expect };
export { unwrap } from './api-client';
export type { Todo } from './api-client';
