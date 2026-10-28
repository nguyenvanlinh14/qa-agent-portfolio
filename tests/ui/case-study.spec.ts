import { test, expect } from '../fixtures';
import {
  BLUEPRINT_STYLE,
  CASE_STUDY_CONTEXT,
  CASE_STUDY_NOTE,
  CASE_STUDY_SECTIONS,
  CONFIDENTIAL_PATTERNS,
  CONFIDENTIAL_SAMPLES,
  EMAIL_PATTERN,
  NOT_CONFIDENTIAL_TEXT,
  PHONE_PATTERN,
  TRIAGE_EXAMPLE,
  WORKFLOW_FIGURES,
  WORKFLOW_NAMES,
} from '../data';

test.describe('Case study page', () => {
  test.beforeEach(async ({ caseStudyPage }) => {
    await caseStudyPage.goto();
  });

  test('@smoke case study shows the Problem, Approach and Results headings', async ({ caseStudyPage }) => {
    for (const name of ['Problem', 'Approach', 'Results']) {
      await expect(caseStudyPage.sectionHeading(name)).toBeVisible();
    }
  });

  test('@regression case study keeps the full section structure', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.article.getByRole('heading', { level: 2 })).toHaveText([...CASE_STUDY_SECTIONS]);
  });

  test('@regression case study states the anonymised context', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.context).toHaveText(CASE_STUDY_CONTEXT);
    await expect(caseStudyPage.note).toHaveText(CASE_STUDY_NOTE);
  });

  test('@regression approach describes the three workflows as tables', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.workflowTables).toHaveCount(WORKFLOW_NAMES.length);
    for (const table of await caseStudyPage.workflowTables.all()) {
      await expect(table.getByRole('row')).not.toHaveCount(1);
    }
  });

  test('@regression evidence stamp mock shows a TEST and a PROD label', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.stampMocks).toBeVisible();
    await expect(caseStudyPage.stampMocks).toContainText(/TEST · tenant A · \w+ · \d{2}:\d{2} JST/);
    await expect(caseStudyPage.stampMocks).toContainText(/PROD · tenant B · \w+ · \d{2}:\d{2} JST/);
  });

  test('@regression evidence stamp mocks are drawn as blueprint figures', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.stampFigures).toHaveCount(2);
    for (const figure of await caseStudyPage.stampFigures.all()) {
      await expect(figure).toHaveAttribute('data-style', BLUEPRINT_STYLE);
    }
  });

  test('@regression blueprint stamp mocks are drawn in once they scroll into view', async ({ caseStudyPage }) => {
    await caseStudyPage.stampMocks.scrollIntoViewIfNeeded();
    await expect(caseStudyPage.stampStrokes.first()).toHaveCSS('stroke-dashoffset', '0px');
  });

  test('@regression results show the headline numbers', async ({ caseStudyPage }) => {
    for (const { label, value } of WORKFLOW_FIGURES) {
      await expect(caseStudyPage.stat(label)).toContainText(value.replace('~', ''));
    }
  });

  test('@regression results keep the triage example numbers', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.results).toContainText(TRIAGE_EXAMPLE.immediate);
    await expect(caseStudyPage.results).toContainText(TRIAGE_EXAMPLE.paused);
  });

  test('@regression case study contains no email address or phone number', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.article).toBeVisible();
    await expect(caseStudyPage.article).not.toHaveText(EMAIL_PATTERN);
    await expect(caseStudyPage.article).not.toHaveText(PHONE_PATTERN);
    await expect(caseStudyPage.emailOrPhoneLinks).toHaveCount(0);
  });

  for (const { name, pattern } of CONFIDENTIAL_PATTERNS) {
    test(`@regression case study contains no ${name}`, async ({ caseStudyPage }) => {
      await expect(caseStudyPage.article).toBeVisible();
      await expect(caseStudyPage.article).not.toHaveText(pattern);
    });
  }

  test('@regression case study embeds no raster screenshots', async ({ caseStudyPage }) => {
    await expect(caseStudyPage.article).toBeVisible();
    await expect(caseStudyPage.rasterImages).toHaveCount(0);
  });
});

test.describe('Case study on a phone', () => {
  test('@regression has no horizontal overflow at 375px', async ({ page, caseStudyPage }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await caseStudyPage.goto();
    await expect(caseStudyPage.title).toBeVisible();
    expect(await caseStudyPage.hasHorizontalOverflow()).toBe(false);
  });
});

// Pure checks of the confidentiality patterns themselves (no browser).
test.describe('Confidentiality patterns', () => {
  for (const { name, text } of CONFIDENTIAL_SAMPLES) {
    test(`@regression "${name}" pattern flags "${text}"`, () => {
      const rules = CONFIDENTIAL_PATTERNS.filter((p) => p.name === name);
      expect(rules, `no pattern named ${name}`).not.toHaveLength(0);
      expect(rules.some((r) => r.pattern.test(text))).toBe(true);
    });
  }

  for (const text of NOT_CONFIDENTIAL_TEXT) {
    test(`@regression confidential patterns ignore "${text}"`, () => {
      for (const { pattern } of CONFIDENTIAL_PATTERNS) expect(text).not.toMatch(pattern);
    });
  }
});
