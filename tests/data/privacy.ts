/** Contact details that must never appear on the public CV (GitHub is the only contact channel). */
export const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

/** International (+84 ...), grouped (090 123 4567) or long digit runs; deliberately ignores ISO dates like 2026-10-27. */
export const PHONE_PATTERN = /\+\d[\d\s().-]{7,}\d|\(?\d{2,4}\)?[\s.-]\d{3}[\s.-]\d{3,4}|\d{9,}/;

export const GITHUB_PROFILE_URL = 'https://github.com/nguyenvanlinh14';
