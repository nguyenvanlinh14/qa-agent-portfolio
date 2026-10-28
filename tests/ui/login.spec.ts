import { test, expect } from '../fixtures';
import { unknownUser, users, wrongPasswordUser } from '../data/factories';
import { DISCLAIMER, FROZEN_QUERY, sessionKey } from '../data/market';

test.describe('Login (anonymous visitor)', () => {
  // Negative and positive login flows must not reuse the stored session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('@smoke valid credentials open the market board', async ({ loginPage, boardPage }) => {
    await loginPage.login(users.qa);
    await loginPage.expectLoggedIn();
    await expect(boardPage.currentUser).toHaveText(users.qa.email);
  });

  test('@regression the page is branded and carries the demo disclaimer', async ({ loginPage, page }) => {
    await expect(loginPage.heading).toBeVisible();
    await expect(page).toHaveTitle(/MarketFlow \(demo\)/);
    await expect(loginPage.disclaimer).toHaveText(DISCLAIMER);
  });

  test('@regression wrong password shows an error', async ({ loginPage, page }) => {
    await loginPage.login(wrongPasswordUser());
    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/demo\/$/);
  });

  test('@regression unknown user shows an error', async ({ loginPage }) => {
    await loginPage.login(unknownUser());
    await expect(loginPage.error).toHaveText('Invalid email or password');
  });

  test('@regression empty fields are rejected', async ({ loginPage }) => {
    await loginPage.submit.click();
    await expect(loginPage.error).toHaveText('Email and password are required');
  });

  test('@regression missing password is rejected', async ({ loginPage }) => {
    await loginPage.email.fill(users.qa.email);
    await loginPage.submit.click();
    await expect(loginPage.error).toHaveText('Email and password are required');
  });

  test('@regression the show button reveals the password and the hide button masks it again', async ({ loginPage }) => {
    await loginPage.password.fill(users.qa.password);
    await expect(loginPage.password).toHaveAttribute('type', 'password');
    await loginPage.showPassword.click();
    await expect(loginPage.password).toHaveAttribute('type', 'text');
    await loginPage.hidePassword.click();
    await expect(loginPage.password).toHaveAttribute('type', 'password');
  });

  test('@regression remember me is on by default', async ({ loginPage }) => {
    await expect(loginPage.rememberMe).toBeChecked();
  });

  test('@regression without remember me the session stays out of localStorage', async ({ loginPage, page }) => {
    await loginPage.rememberMe.uncheck();
    await loginPage.login(users.qa);
    await loginPage.expectLoggedIn();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBeNull();
  });

  test('@regression the frozen query is carried from the login page to the board', async ({ loginPage, page }) => {
    await loginPage.open(FROZEN_QUERY);
    await loginPage.login(users.qa);
    await expect(page).toHaveURL(/\/demo\/board\.html\?seed=42&frozen=1$/);
  });
});

test.describe('Login (liquid background)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('@regression the liquid background is decorative and animates while motion is allowed', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.liquidBackground).toBeAttached();
    await expect(loginPage.liquidBackground).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(async () => (await loginPage.liquidState())?.frames ?? 0).toBeGreaterThan(3);
    expect(await loginPage.liquidState()).toMatchObject({ running: true, mode: 'live', blobs: 4 });
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('@regression the liquid background is drawn once and runs no loop', async ({ loginPage }) => {
      await loginPage.goto();
      await expect(loginPage.liquidBackground).toBeAttached();
      await expect.poll(() => loginPage.liquidState()).toEqual({ running: false, mode: 'static', frames: 0, blobs: 4 });
    });
  });

  test('@regression frozen mode keeps the liquid background static', async ({ loginPage }) => {
    await loginPage.open(FROZEN_QUERY);
    await expect(loginPage.liquidBackground).toBeAttached();
    await expect.poll(() => loginPage.liquidState()).toEqual({ running: false, mode: 'static', frames: 0, blobs: 4 });
  });
});

test.describe('Access control (anonymous visitor)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('@smoke the board redirects to the login page', async ({ boardPage, loginPage, page }) => {
    await boardPage.open();
    await expect(page).toHaveURL(/\/demo\/index\.html/);
    await expect(loginPage.submit).toBeVisible();
  });

  test('@regression the watchlist redirects to the login page', async ({ watchlistPage, loginPage, page }) => {
    await watchlistPage.open();
    await expect(page).toHaveURL(/\/demo\/index\.html/);
    await expect(loginPage.submit).toBeVisible();
  });

  test('@regression the screener redirects to the login page', async ({ screenerPage, loginPage, page }) => {
    await screenerPage.open();
    await expect(page).toHaveURL(/\/demo\/index\.html/);
    await expect(loginPage.submit).toBeVisible();
  });

  test('@regression a stock detail page redirects to the login page', async ({ stockPage, loginPage, page }) => {
    await stockPage.openTicker('ACB');
    await expect(page).toHaveURL(/\/demo\/index\.html/);
    await expect(loginPage.submit).toBeVisible();
  });
});

test.describe('Login (stored session)', () => {
  test('@regression signed-in user is redirected away from the login page', async ({ loginPage, page }) => {
    await loginPage.goto();
    await expect(page).toHaveURL(/\/demo\/board\.html$/);
  });

  test('@regression signing out returns to the login page', async ({ boardPage, loginPage, page }) => {
    await boardPage.open();
    await boardPage.signOut.click();
    await expect(page).toHaveURL(/\/demo\/(index\.html)?(\?.*)?$/);
    await expect(loginPage.submit).toBeVisible();
  });

  test('@regression after signing out the board is no longer reachable', async ({ boardPage, loginPage, page }) => {
    await boardPage.open();
    await boardPage.signOut.click();
    await boardPage.open();
    await expect(page).toHaveURL(/\/demo\/index\.html/);
    await expect(loginPage.submit).toBeVisible();
  });
});
