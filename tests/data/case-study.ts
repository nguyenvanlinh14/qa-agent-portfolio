/** Facts the site states about the AI-agent QA workflow and the public demo it is measured on. */

/** The three workflows, in the order they appear on the home page. */
export const WORKFLOW_NAMES: readonly string[] = ['Build the suite', 'Test cycle', 'Release'];

export const LANE_NAMES = { qc: 'QC — decides', agent: 'Agent — does' } as const;

/**
 * Headline figures, measured on this public repo at build time (scripts/build-site.mjs), so the counts change as the
 * suite grows. Specs check the labels, the fixed values and that the counts add up; not a frozen number.
 */
export const DEMO_STAT_LABELS = {
  total: 'automated tests',
  demo: 'on MarketFlow pages',
  api: 'API tests',
  tags: 'smoke / regression',
  ciRun: 'full CI test run',
  k6Gate: 'p95 gate (k6)',
} as const;

/** The two figures that are not counted at build time: CI run time and the k6 threshold in k6/load.js. */
export const DEMO_FIXED_FIGURES: readonly { label: string; value: string }[] = [
  { label: DEMO_STAT_LABELS.ciRun, value: '~2 min' },
  { label: DEMO_STAT_LABELS.k6Gate, value: '< 300 ms' },
];

export const DEMO_STATS_NOTE =
  'Measured on this public repo and the MarketFlow demo app (simulated data), CI run of 29 Oct 2026.';

/** Figures and details from the client project that the site must no longer publish. */
export const PROJECT_ONLY_DETAILS: readonly string[] = [
  '1,890',
  '17/17',
  'sub-features automated',
  'closed with PROD evidence',
  'Backtest',
  '28 Oct 2026',
  '6 roles',
];

/** The case study's top-level sections, in order. */
export const CASE_STUDY_SECTIONS: readonly string[] = ['Problem', 'Approach', 'Key techniques', 'Results', 'Tools', 'Lessons'];

export const CASE_STUDY_CONTEXT = 'Multi-tenant B2B SaaS for Japanese stock screening (client names withheld)';
export const CASE_STUDY_NOTE =
  "Details anonymised. The project's own figures are not published; the numbers above are measured on the public demo.";
