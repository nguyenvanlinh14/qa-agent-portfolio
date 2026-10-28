import { test, expect } from '../fixtures';
import {
  EMAIL_PATTERN,
  FAKE_PHONE_NUMBERS,
  GITHUB_PROFILE_URL,
  LINKEDIN_PROFILE_URL,
  MIN_CV_FREELANCE_ENGAGEMENTS,
  MIN_CV_ROLES,
  NOT_PHONE_TEXT,
  PHONE_PATTERN,
} from '../data';

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

  test('@smoke CV shows the experience section with several roles', async ({ cvPage }) => {
    await expect(cvPage.experience).toBeVisible();
    await expect(cvPage.roles.first()).toBeVisible();
    await expect.poll(() => cvPage.roles.count()).toBeGreaterThanOrEqual(MIN_CV_ROLES);
  });

  test('@regression CV links to the LinkedIn profile', async ({ cvPage }) => {
    await expect(cvPage.profileLink(/linkedin/i)).toHaveAttribute('href', LINKEDIN_PROFILE_URL);
  });

  test('@regression CV links to the GitHub profile', async ({ cvPage }) => {
    await expect(cvPage.profileLink(/github/i)).toHaveAttribute('href', GITHUB_PROFILE_URL);
  });

  test('@regression freelance role lists its engagements', async ({ cvPage }) => {
    await expect(cvPage.engagements.first()).toBeVisible();
    await expect(cvPage.experience.getByRole('list', { name: /Freelance engagements/ })).toBeVisible();
    await expect.poll(() => cvPage.engagements.count()).toBeGreaterThanOrEqual(MIN_CV_FREELANCE_ENGAGEMENTS);
    await expect(cvPage.experience).not.toContainText(/alongside Gameloft|evenings/);
  });

  test('@regression Picon Technology and Human Brain Global are one role', async ({ cvPage }) => {
    const merged = cvPage.roleMentioning('Picon Technology', 'Human Brain Global');
    await expect(merged).toHaveCount(1);
    await expect(merged).toContainText('Apr 2025 – Present');
    await expect(merged).toContainText('same owner');
    await expect(cvPage.roles.filter({ hasText: 'Human Brain Global' })).toHaveCount(1);
    await expect(cvPage.roles.filter({ hasText: 'Picon Technology' })).toHaveCount(1);
    await expect(cvPage.experience).not.toContainText('Jun 2026 – Present');
  });

  test('@regression Gameloft DAD is an earlier role, not a freelance engagement', async ({ cvPage }) => {
    const gameloft = cvPage.roles.filter({ hasText: 'Gameloft DAD' });
    await expect(gameloft).toHaveCount(1);
    await expect(gameloft).toContainText('Until 2019');
    await expect(cvPage.engagements.filter({ hasText: 'Gameloft' })).toHaveCount(0);
  });

  test('@regression Workout Tracking engagement ends in Jan 2023', async ({ cvPage }) => {
    await expect(cvPage.engagement('Workout Tracking')).toContainText('Jul 2022 – Jan 2023');
  });

  test('@regression CV no longer lists the removed engagement', async ({ cvPage }) => {
    await expect(cvPage.cv).toBeVisible();
    await expect(cvPage.cv).not.toContainText(/Conversation\s*HEALTH/i);
  });

  test('@regression experience links to the case study', async ({ cvPage }) => {
    await expect(cvPage.caseStudyLink).toHaveAttribute('href', 'case-study.html');
  });

  test('@regression CV shows education and certifications', async ({ cvPage }) => {
    await expect(cvPage.education).toContainText('Van Lang University');
    await expect(cvPage.certifications.getByRole('listitem')).not.toHaveCount(0);
  });

  test('@regression the only learning skill is Go', async ({ cvPage }) => {
    await expect(cvPage.skills.locator('.learning')).toHaveCount(1);
    await expect(cvPage.skills.locator('.learning')).toContainText('Go');
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

// Pure checks of the privacy patterns themselves (no browser): the CV is full of year ranges and counts.
test.describe('Privacy patterns', () => {
  for (const sample of FAKE_PHONE_NUMBERS) {
    test(`@regression PHONE_PATTERN flags "${sample}"`, () => {
      expect(sample).toMatch(PHONE_PATTERN);
    });
  }

  for (const sample of NOT_PHONE_TEXT) {
    test(`@regression PHONE_PATTERN ignores "${sample}"`, () => {
      expect(sample).not.toMatch(PHONE_PATTERN);
    });
  }

  test('@regression EMAIL_PATTERN flags an email address', () => {
    expect('someone@example.com').toMatch(EMAIL_PATTERN);
  });
});
