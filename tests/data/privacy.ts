/** Contact details that must never appear on the public CV (profile links are the only contact channels). */
export const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

/**
 * International (+84 ...), grouped with a leading 0 / area code in brackets (090 123 4567, (028) 123 4567),
 * US style (555-123-4567) or long digit runs.
 * Deliberately ignores what a CV is full of: year ranges (2018 – 2020), ISO dates (2026-10-27),
 * counts (300+ test cases) and percentages (37%).
 */
export const PHONE_PATTERN =
  /(?<!\w)\+\d[\d\s().-]{7,}\d|(?<!\d)(?:\(\d{2,4}\)|0\d{1,3})[\s.-]?\d{3}[\s.-]\d{3,4}(?!\d)|(?<!\d)\d{3}[.-]\d{3}[.-]\d{4}(?!\d)|\d{9,}/;

/** Obviously fake numbers the pattern must catch (guards the regex against being loosened). */
export const FAKE_PHONE_NUMBERS: readonly string[] = [
  '+84 90 123 4567',
  '+84901234567',
  '090 123 4567',
  '090.123.4567',
  '(028) 123 4567',
  '0901234567',
  '555-123-4567',
  '+1 (415) 555 0100',
];

/** Normal CV content that looks number-heavy but is not a phone number. */
export const NOT_PHONE_TEXT: readonly string[] = [
  '2018 – 2020',
  'Mar 2023 – Oct 2025',
  'Jul 2022 – 2023',
  '2018-2020',
  '2019 - 2020 300 500',
  'Jan 2020 300 400',
  '2026-10-27',
  '300+ test cases',
  '500+ test cases per platform',
  '5+ years',
  'Dungeon Hunter 5 (37%), War Planet Online (40%), Modern Combat 5 (20%)',
];
