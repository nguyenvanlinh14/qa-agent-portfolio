import { test, expect } from '../fixtures';
import { BRAND_NAME, LINKEDIN_PROFILE_URL, TOP_NAV_PAGES } from '../data';

test.describe('Site top bar', () => {
  for (const { name, path } of TOP_NAV_PAGES) {
    test(`@regression ${name} shows the ${BRAND_NAME} brand`, async ({ siteNav }) => {
      await siteNav.open(path);
      await expect(siteNav.brand(BRAND_NAME)).toBeVisible();
    });

    test(`@regression ${name} links to the LinkedIn profile from the top bar`, async ({ siteNav }) => {
      await siteNav.open(path);
      await expect(siteNav.linkedIn).toBeVisible();
      await expect(siteNav.linkedIn).toHaveAttribute('href', LINKEDIN_PROFILE_URL);
    });
  }
});
