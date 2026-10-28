// The portfolio guide (site/assets/guide.js): its tour script and the voice clips made by scripts/guide/voice.mjs.
import { readFileSync } from 'node:fs';

type Text = Record<'en' | 'vi', string>;
export interface GuideStep {
  id: string;
  target: string;
  title: Text;
  say: Text;
}
interface Tour {
  name: string;
  voices: Record<string, { name: string }>;
  steps: GuideStep[];
}
interface Voice {
  clips: Record<string, Record<string, { file: string; ms: number }>>;
}

const read = <T>(file: string): T => JSON.parse(readFileSync(new URL(`../../site/guide/${file}`, import.meta.url), 'utf8')) as T;
const tour = read<Tour>('tour.json');
const voice = read<Voice>('voice.json');

const stepAt = (i: number): GuideStep => {
  const s = tour.steps.at(i);
  if (!s) throw new Error(`site/guide/tour.json has no step ${i}`);
  return s;
};

export const GUIDE_NAME = tour.name;
export const GUIDE_LANGS = Object.keys(tour.voices);
export const GUIDE_STEPS: readonly GuideStep[] = tour.steps;
export const GUIDE_FIRST = stepAt(0);
export const GUIDE_SECOND = stepAt(1);
export const GUIDE_LAST = stepAt(-1);
export const GUIDE_CLIPS: readonly { lang: string; id: string; file: string }[] = Object.entries(voice.clips).flatMap(
  ([lang, clips]) => Object.entries(clips).map(([id, c]) => ({ lang, id, file: c.file })),
);
/** The "Click me" bubble next to the launcher, per language (site/assets/guide.js). */
export const GUIDE_HINT = {
  en: '👋 Click me! A 1-minute tour of this portfolio',
  vi: '👋 Bấm vào mình nhé! Tour 1 phút qua portfolio',
} as const;
/** Step counter text as the panel shows it, e.g. "2 / 10". */
export const guideCount = (index: number): string => `${index + 1} / ${GUIDE_STEPS.length}`;
