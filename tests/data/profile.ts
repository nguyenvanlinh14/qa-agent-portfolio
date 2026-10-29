/** Public profile links shown on the portfolio (the only contact channels; no email or phone). */
export const GITHUB_PROFILE_URL = 'https://github.com/nguyenvanlinh14';
export const LINKEDIN_PROFILE_URL = 'https://www.linkedin.com/in/linh-nguyen-7495333b6/';

/** The CV lists at least this many roles in its Experience section. */
export const MIN_CV_ROLES = 3;

/** The freelance role lists at least this many engagements (ERP, Mable, Sonic, Workout Tracking, Good to Great Schools). */
export const MIN_CV_FREELANCE_ENGAGEMENTS = 5;

/** Site name in the top nav of every page. */
export const BRAND_NAME = 'Linh.NV';

/** Pages whose top bar carries the brand and the LinkedIn link. */
export const TOP_NAV_PAGES: readonly { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'cv', path: '/cv.html' },
  { name: 'case study', path: '/case-study.html' },
  { name: 'lesson', path: '/lessons/01-ai-agents-in-qa.html' },
  { name: 'bug evidence', path: '/evidence/' },
  { name: 'live run', path: '/live/?src=examples/failing-run.jsonl&speed=max' },
];

/** The printed CV ("Save as PDF") keeps the page's light-theme look, whatever theme is on screen. */
export const CV_PRINT = {
  /** Light-theme --accent-2, the colour of the CV's profile links on screen. */
  linkColor: 'rgb(8, 122, 96)',
  /** Backgrounds (skill chips, cards) print even with "Background graphics" off. */
  colorAdjust: 'exact',
} as const;
