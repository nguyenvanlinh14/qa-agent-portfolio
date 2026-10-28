// localStorage keys shared on the GitHub Pages origin. The Playwright HTML report under /report/
// owns `theme` and only understands its own values; the portfolio must keep its theme elsewhere.
export const SITE_THEME_KEY = 'linhqa-theme';
export const REPORT_THEME_KEY = 'theme';
export const REPORT_THEME_VALUES = ['dark-mode', 'light-mode', 'system'] as const;
