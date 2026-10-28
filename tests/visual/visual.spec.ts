import { test, expect } from '../fixtures';

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

  test('@regression demo login page matches the baseline', async ({ page, loginPage }) => {
    await loginPage.goto();
    await page.evaluate(() => document.fonts.ready);
    await expect(loginPage.heading).toBeVisible();
    await expect(page).toHaveScreenshot('demo-login.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});
