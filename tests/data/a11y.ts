// Accessibility scope and the known-issue baseline ("ratchet") for tests/ui/a11y.spec.ts.
// A page may keep a listed violation up to `maxNodes`; any new rule, or more nodes, fails the test.
// Fixing a known issue never fails: the test then reports that the entry can be removed.
export const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;
export const COLOR_SCHEMES = ['light', 'dark'] as const;

export interface KnownA11yIssue {
  rule: string;
  maxNodes: number;
  /** Why it is accepted for now and who decides when it gets fixed. */
  reason: string;
}

export const A11Y_PAGES: readonly { name: string; path: string; known?: readonly KnownA11yIssue[] }[] = [
  { name: 'home', path: '/' },
  { name: 'case study', path: '/case-study.html' },
  { name: 'cv', path: '/cv.html' },
  { name: 'lesson', path: '/lessons/01-ai-agents-in-qa.html' },
  { name: 'live run', path: '/live/?src=examples/failing-run.jsonl&speed=max' },
  { name: 'bug evidence', path: '/evidence/' },
  { name: 'k6 dashboards', path: '/perf/' },
  { name: 'demo login', path: '/demo/?seed=42&frozen=1' },
  { name: 'demo board', path: '/demo/board.html?seed=42&frozen=1' },
  {
    name: 'demo watchlist',
    path: '/demo/watchlist.html?seed=42&frozen=1',
    known: [
      {
        rule: 'link-in-text-block',
        maxNodes: 1,
        reason: 'Empty-state link "market board" is told apart from the text by colour only. Demo app behaviour is frozen (CLAUDE.md); fix needs a human decision.',
      },
    ],
  },
  { name: 'demo screener', path: '/demo/screener.html?seed=42&frozen=1' },
  { name: 'demo stock', path: '/demo/stock.html?t=ACB&seed=42&frozen=1' },
];
