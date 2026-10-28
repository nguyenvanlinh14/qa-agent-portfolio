import { test, expect } from '../fixtures';
import { users } from '../data/factories';
import { FROZEN_QUERY } from '../data/market';

test.describe('Visual regression', () => {
  // The hero particles are deterministic under this project's reducedMotion (fixed-seed static frame), so no mask is needed.
  test('@regression home hero matches the baseline', async ({ page, homePage }) => {
    await homePage.goto();
    await page.evaluate(() => document.fonts.ready);
    await expect(homePage.heroTitle).toBeVisible();
    await expect(page.locator('.hero')).toHaveScreenshot('home-hero.png', {
      mask: [homePage.stats], // numbers change with every build
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  // `frozen=1` stops every animation (liquid background, ripples) and the price simulation, so the frame is deterministic.
  test('@regression demo login page matches the baseline', async ({ page, loginPage }) => {
    await loginPage.open('?frozen=1');
    await page.evaluate(() => document.fonts.ready);
    await expect(loginPage.heading).toBeVisible();
    await expect(page).toHaveScreenshot('demo-login.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('@regression demo market board matches the baseline', async ({ page, loginPage, boardPage }) => {
    // The visual project has no stored session: sign in through the UI; the frozen query is carried to the board.
    await loginPage.open(FROZEN_QUERY);
    await loginPage.login(users.qa);
    await loginPage.expectLoggedIn();
    await page.evaluate(() => document.fonts.ready);
    await expect(boardPage.rows).toHaveCount(30);
    await expect(page).toHaveScreenshot('demo-board.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});
