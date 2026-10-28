/** Facts the site states about the AI-agent QA workflow (source: the project brief, October 2026). */

/** The three workflows, in the order they appear on the home page. */
export const WORKFLOW_NAMES: readonly string[] = ['Build the suite', 'Test cycle', 'Release'];

export const LANE_NAMES = { qc: 'QC — decides', agent: 'Agent — does' } as const;

/** Headline figures: the label identifies the tile, the value is what it must show. */
export const WORKFLOW_FIGURES: readonly { label: string; value: string }[] = [
  { label: 'sub-features automated', value: '82%' },
  { label: 'automated cases', value: '~1,890' },
  { label: 'UI regression flows', value: '69' },
  { label: 'tickets passed on TEST', value: '17/17' },
  { label: 'PROD evidence', value: '14' },
  { label: 'full TEST regression', value: '22 min' },
];

/** The case study's top-level sections, in order. */
export const CASE_STUDY_SECTIONS: readonly string[] = ['Problem', 'Approach', 'Key techniques', 'Results', 'Tools', 'Lessons'];

export const CASE_STUDY_CONTEXT = 'Multi-tenant B2B SaaS for Japanese stock screening (client names withheld)';
export const CASE_STUDY_NOTE = 'Details anonymised; numbers are from the project, October 2026.';

/** The race example from the Results section: 7 of 7 immediate clicks failed, 0 of 10 after a pause. */
export const TRIAGE_EXAMPLE = { immediate: '7 of 7', paused: '0 of 10' } as const;
