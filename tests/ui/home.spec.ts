import { test, expect } from '../fixtures';
import { GITHUB_PROFILE_URL, LANE_NAMES, LINKEDIN_PROFILE_URL, WORKFLOW_FIGURES, WORKFLOW_NAMES, loadContributions } from '../data';

const contributions = loadContributions();

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

  test('@regression eyebrow states the years of experience', async ({ homePage }) => {
    await expect(homePage.eyebrow).toContainText('5+ yrs');
  });

  test('@regression footer links to the LinkedIn profile', async ({ homePage }) => {
    await expect(homePage.footerLinkedIn).toHaveAttribute('href', LINKEDIN_PROFILE_URL);
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

  test('@smoke agent workflow section shows the three workflows and links to the case study', async ({ page, homePage }) => {
    await expect(homePage.workflowHeading).toBeVisible();
    await expect(homePage.workflows).toHaveCount(WORKFLOW_NAMES.length);
    for (const name of WORKFLOW_NAMES) await expect(homePage.workflow(name)).toBeVisible();
    await expect(homePage.caseStudyCta).toHaveAttribute('href', 'case-study.html');
    await homePage.caseStudyCta.click();
    await expect(page).toHaveURL(/\/case-study\.html$/);
  });

  test('@regression each workflow has a QC lane and an Agent lane', async ({ homePage }) => {
    for (const name of WORKFLOW_NAMES) {
      const card = homePage.workflow(name);
      await expect(homePage.lane(card, LANE_NAMES.qc)).toHaveCount(1);
      await expect(homePage.lane(card, LANE_NAMES.agent)).toHaveCount(1);
      await expect(card.getByRole('listitem')).not.toHaveCount(0);
    }
  });

  test('@regression workflow stats show the project figures', async ({ homePage }) => {
    await expect(homePage.workflowStats).toBeVisible();
    for (const { label, value } of WORKFLOW_FIGURES) {
      await expect(homePage.workflowStat(label)).toContainText(value);
    }
  });

  test('@regression nav links to the workflow section', async ({ homePage }) => {
    await expect(homePage.navWorkflowLink).toHaveAttribute('href', '#workflow');
  });

  test('@regression workflows sit side by side on desktop', async ({ homePage }) => {
    await expect(homePage.workflows.first()).toBeVisible();
    expect(new Set(await homePage.workflowTops()).size).toBe(1);
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

  test('@smoke open-source contributions are listed with their stage', async ({ homePage }) => {
    await expect(homePage.contributionCards.first()).toBeVisible();
    for (const card of await homePage.contributionCards.all()) {
      await expect(homePage.contributionLink(card, 'Issue')).toHaveAttribute(
        'href',
        /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/,
      );
      await expect(homePage.contributionTrackSteps(card)).toHaveCount(4);
    }
  });

  test('@regression a contribution shows its Run link only when it has evidence', async ({ homePage }) => {
    for (const c of contributions) {
      const run = homePage.contributionLink(homePage.contributionCard(c.repo, c.issue), 'Run');
      if (c.links.evidence) await expect(run).toHaveAttribute('href', c.links.evidence);
      else await expect(run).toHaveCount(0);
    }
  });

  test('@smoke services section links to the CV', async ({ page, homePage }) => {
    await expect(homePage.workCta).toHaveAttribute('href', 'cv.html');
    await homePage.workCta.click();
    await expect(page).toHaveURL(/\/cv\.html$/);
  });

  test('@regression services offers four tiles, each with an evidence link into the repo', async ({ homePage }) => {
    await expect(homePage.serviceTiles).toHaveCount(4);
    for (const tile of await homePage.serviceTiles.all()) {
      await expect(tile.getByRole('link').first()).toHaveAttribute(
        'href',
        /^https:\/\/github\.com\/nguyenvanlinh14\/qa-agent-portfolio\/(tree|blob)\/main\//,
      );
    }
  });

  test('@regression services GitHub button points to the profile', async ({ homePage }) => {
    await expect(homePage.githubCta).toHaveAttribute('href', GITHUB_PROFILE_URL);
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
  test('@regression workflows stack vertically at 375px', async ({ page, homePage }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await homePage.goto();
    await expect(homePage.workflows.first()).toBeVisible();
    expect(new Set(await homePage.workflowTops()).size).toBe(WORKFLOW_NAMES.length);
    expect(await homePage.hasHorizontalOverflow()).toBe(false);
  });

  test('@regression has no horizontal overflow at 375px', async ({ page, homePage }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await homePage.goto();
    await expect(homePage.heroTitle).toBeVisible();
    expect(await homePage.hasHorizontalOverflow()).toBe(false);
  });
});
