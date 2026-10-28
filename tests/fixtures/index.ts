import { test as base, expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { users } from '../data/factories';
import { CaseStudyPage, CvPage, HomePage, LessonPage, LoginPage, TodoPage } from '../pages';

interface Fixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  todoPage: TodoPage;
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
  todoPage: async ({ page }, use) => use(new TodoPage(page)),
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
