// Recorded runs the live dashboard replays (site/live/*.jsonl) and what it must show once a replay has finished.
export const LIVE_PATH = '/live/';
/** Where the `page` fixture drops one screenshot + URL per UI test for the live reporter (same path as the reporter). */
export const LIVE_FRAMES_RAW = 'reports/live-frames/raw';

/** Hand-written run with one of each outcome: pass, fail, flaky (fail then pass on retry), skipped. */
export const FAILING_RUN = {
  src: 'examples/failing-run.jsonl',
  total: 4,
  passed: 1,
  failed: 1,
  flaky: 1,
  skipped: 1,
  status: 'failed',
  failures: ['Watchlist › @regression a removal survives a reload', 'Market board › @regression sorting by %Chg puts the biggest gain first'],
  projects: ['ui', 'api'],
  /** The last UI attempt with a screenshot: the board test that passed on retry. */
  lastPage: '/demo/board.html?seed=42&frozen=1',
  lastOutcome: 'flaky',
} as const;

export const SAMPLE_RUN_SRC = 'sample-run.jsonl';

export const EVIDENCE_PATH = '/evidence/';
export const EVIDENCE_BUG = {
  id: 'watchlist-remove-not-saved',
  title: 'Watchlist: a removed stock comes back after a reload',
  reportRows: ['Device', 'OS', 'Prerequisite', 'Account', 'Steps', 'Actual', 'Expected', 'Scope'],
} as const;

/** Reels on the home page, in order: kind, the page its link opens, whether it has a narration track. */
export const REELS = [
  { kind: 'evidence', href: 'evidence/', sound: true },
  { kind: 'live', href: 'live/', sound: false },
  { kind: 'k6', href: 'perf/', sound: false },
] as const;
