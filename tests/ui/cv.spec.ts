import { test, expect } from '../fixtures';
import { EMAIL_PATTERN, PHONE_PATTERN } from '../data';

test.describe('CV page', () => {
  test.beforeEach(async ({ cvPage }) => {
    await cvPage.goto();
  });

  test('@smoke CV page shows the summary and skills', async ({ cvPage }) => {
    await expect(cvPage.summary).toBeVisible();
    await expect(cvPage.summary).toContainText('Playwright');
    await expect(cvPage.skills).toBeVisible();
    await expect(cvPage.skill('TypeScript')).toBeVisible();
  });

  test('@regression CV contains no email address or phone number', async ({ cvPage }) => {
    await expect(cvPage.cv).toBeVisible();
    await expect(cvPage.cv).not.toHaveText(EMAIL_PATTERN);
    await expect(cvPage.cv).not.toHaveText(PHONE_PATTERN);
    await expect(cvPage.emailOrPhoneLinks).toHaveCount(0);
  });

  test('@regression print button exists', async ({ cvPage }) => {
    await expect(cvPage.printButton).toBeVisible();
    await expect(cvPage.printButton).toBeEnabled();
  });
});
