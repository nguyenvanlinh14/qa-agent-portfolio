import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Contribution {
  repo: string;
  issue: number;
  title: string;
  kind: 'fix' | 'ci' | 'docs' | 'feature';
  stage: 'proposed' | 'pr' | 'review' | 'merged';
  links: { issue: string; draft: string | null; evidence: string | null; pr: string | null };
}

/** The same file the site is built from, so specs follow the data instead of hardcoding it. */
export function loadContributions(): Contribution[] {
  const file = resolve(process.cwd(), 'docs/oss/contributions.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Contribution[];
}
