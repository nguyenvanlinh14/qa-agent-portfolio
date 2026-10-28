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
  'Jul 2022 – Jan 2023',
  'Apr 2025 – Present',
  '2019 – Jan 2026',
  'Until 2019 · ~5 years',
  '2018-2020',
  '2019 - 2020 300 500',
  'Jan 2020 300 400',
  '2026-10-27',
  '300+ test cases',
  '500+ test cases per platform',
  '5+ years',
  'Dungeon Hunter 5 (37%), War Planet Online (40%), Modern Combat 5 (20%)',
];

/**
 * The case study comes from a confidential client project. Nothing that identifies the client may appear:
 * ticket keys, real hostnames, API-key-like strings. (Client and tenant names cannot be listed here without
 * naming them; the review checklist covers those.)
 *
 * The ticket-key pattern is deliberately tight: 2-10 capitals/digits/underscores, a hyphen, 1-6 digits. A short list of
 * technical prefixes that look the same (UTF-8, SHA-256, ISO-8601 ...) is excluded up front.
 */
export const CONFIDENTIAL_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  {
    name: 'ticket key',
    pattern: /\b(?!(?:UTF|ISO|SHA|MD|HTTP|TLS|SSL|AES|RSA|WCAG|RFC|CVE|COVID|IPV|ES|UTC|GMT|JST|X)-)[A-Z][A-Z0-9_]{1,9}-\d{1,6}\b/,
  },
  {
    name: 'real hostname',
    pattern: /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|jp|co|dev|app|ai|vn|au|biz|info)\b/i,
  },
  { name: 'API-key-like string', pattern: /\b(?:sk|pk|api|key|token|secret)[-_][A-Za-z0-9_-]{12,}\b/i },
  { name: 'long opaque identifier', pattern: /\b[A-Za-z0-9_-]{32,}\b/ },
];

/** Strings the confidential patterns must catch (guards them against being loosened). */
export const CONFIDENTIAL_SAMPLES: readonly { name: string; text: string }[] = [
  { name: 'ticket key', text: 'Fixed in PROJ-123' },
  { name: 'ticket key', text: 'see QA-4567 for details' },
  { name: 'ticket key', text: 'STOCK_APP-12 is open' },
  { name: 'ticket key', text: 'AB-1' },
  { name: 'real hostname', text: 'https://app.some-client.com/login' },
  { name: 'real hostname', text: 'admin.stocks.co.jp' },
  { name: 'real hostname', text: 'tenant.corp.io' },
  { name: 'API-key-like string', text: 'sk-abcdef1234567890abcd' },
  { name: 'API-key-like string', text: 'api_key_ABCDEFGHIJKLMNOP' },
  { name: 'long opaque identifier', text: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' },
];

/** Normal technical prose that looks similar but is harmless. */
export const NOT_CONFIDENTIAL_TEXT: readonly string[] = [
  'UTF-8',
  'ES6',
  'ISO-8601 dates',
  'SHA-256 checksum',
  'HTTP-2 and TLS-1.3',
  'ENV · tenant · role · time (JST)',
  'DEV → TEST → PROD',
  'tenant-a.example',
  'https://tenant-b.example/…',
  'Node.js and Playwright + TypeScript',
  'playwright test --list',
  'Release of 28 Oct 2026',
  'Passed on PROD',
  '404 on Backtest',
  'Python (openpyxl, Pillow)',
  'xlsx / HTML reports',
  'Go / No-go',
  'about 7.5 MB in about 15 minutes',
  '@regression @deep @market-data',
];
