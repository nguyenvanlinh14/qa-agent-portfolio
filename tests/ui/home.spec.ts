import { test, expect } from '../fixtures';

test.describe('Portfolio home', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('@smoke hero title is visible', async ({ homePage }) => {
    await expect(homePage.heroTitle).toBeVisible();
    await expect(homePage.heroTitle).toContainText('Agents write the tests');
  });

  test('@smoke eyebrow names the specialty', async ({ homePage }) => {
    await expect(homePage.eyebrow).toContainText('QA Automation');
  });

  test('@smoke report CTA points to the live report', async ({ homePage }) => {
    await expect(homePage.reportCta).toHaveAttribute('href', 'report/');
  });

  test('@smoke demo CTA points to the demo app', async ({ homePage }) => {
    await expect(homePage.demoCta).toHaveAttribute('href', 'demo/');
  });

  test('@smoke repo CTA points to the GitHub repository', async ({ homePage }) => {
    await expect(homePage.repoCta).toHaveAttribute('href', /github\.com\/nguyenvanlinh14\/qa-agent-portfolio/);
  });

  test('@smoke at least 8 lesson cards are listed', async ({ homePage }) => {
    expect(await homePage.lessonCards.count()).toBeGreaterThanOrEqual(8);
  });

  test('@regression stats block is visible', async ({ homePage }) => {
    await expect(homePage.stats).toBeVisible();
  });

  test('@regression pipeline is visible', async ({ homePage }) => {
    await expect(homePage.pipeline).toBeVisible();
  });

  test('@regression open source block is visible', async ({ homePage }) => {
    await expect(homePage.ossBlock).toBeVisible();
  });

  test('@regression theme toggle flips html[data-theme]', async ({ page, homePage }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await homePage.themeToggle.click();
    await expect(homePage.html).toHaveAttribute('data-theme', 'light');
    await homePage.themeToggle.click();
    await expect(homePage.html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Portfolio home on a phone', () => {
  test('@regression has no horizontal overflow at 375px', async ({ page, homePage }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await homePage.goto();
    await expect(homePage.heroTitle).toBeVisible();
    expect(await homePage.hasHorizontalOverflow()).toBe(false);
  });
});
