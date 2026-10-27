import { test as setup } from '../fixtures';
import { users } from '../data/factories';
import { AUTH_FILE } from './paths';

setup('log into the demo app and store the session', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.qa);
  await loginPage.expectLoggedIn();
  // The demo keeps its session in localStorage; storageState captures it.
  await page.context().storageState({ path: AUTH_FILE });
});
