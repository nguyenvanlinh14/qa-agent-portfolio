// Step 3 of the evidence video: burn karaoke subtitles, a step card and a progress bar into the recording and mix in
// the narration. Also writes WebVTT captions, a poster frame and the bug report, and updates the evidence registry.
//   node scripts/evidence/build-video.mjs evidence/scripts/<id>.json
// Needs ffmpeg with libass (FFMPEG=/path/to/ffmpeg to pick one; `pip install imageio-ffmpeg` ships a static build).
// Inputs from the earlier steps: evidence/out/<id>/narration.json, timeline.json, video.webm, audio/*.wav.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const scriptFile = process.argv[2];
if (!scriptFile) {
  console.error('usage: node scripts/evidence/build-video.mjs evidence/scripts/<id>.json');
  process.exit(2);
}
const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
const dir = join('evidence', 'out', script.id);
const narration = JSON.parse(readFileSync(join(dir, 'narration.json'), 'utf8'));
const timeline = JSON.parse(readFileSync(join(dir, 'timeline.json'), 'utf8'));
const { width: W, height: H } = timeline.size;
const steps = timeline.steps.map((t) => ({
  ...t,
  ...script.steps.find((s) => s.key === t.key),
  clip: narration.clips.find((c) => c.key === t.key),
}));
const total = steps.at(-1).end;
const OUT = join('site', 'evidence');
mkdirSync(OUT, { recursive: true });

// ---------- subtitles (ASS) ----------

const assTime = (ms) => {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};
const assText = (t) => t.replace(/\\/g, '\\\\').replace(/\{/g, '(').replace(/\}/g, ')');

/**
 * Karaoke line: each word gets a \kf (fill sweep) share of the clip, weighted by its length plus a pause after
 * punctuation. TTS does not report word timings, so this estimate is what keeps the highlight close to the voice.
 */
function karaoke(text, ms) {
  const words = text.split(/\s+/).filter(Boolean);
  const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1 + (/[.!?]$/.test(w) ? 4 : /[,;:]$/.test(w) ? 2 : 0);
  const sum = words.reduce((s, w) => s + weight(w), 0);
  let used = 0;
  return words
    .map((w, i) => {
      const cs = i === words.length - 1 ? Math.round(ms / 10) - used : Math.round(((ms / 10) * weight(w)) / sum);
      used += cs;
      return `{\\kf${cs}}${assText(w)}`;
    })
    .join(' ');
}

// ASS colours are &HAABBGGRR.
const ass = [
  '[Script Info]',
  'ScriptType: v4.00+',
  `PlayResX: ${W}`,
  `PlayResY: ${H}`,
  'WrapStyle: 0',
  'ScaledBorderAndShadow: yes',
  '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  // Karaoke: words turn from white (secondary) to amber (primary) as they are read.
  'Style: Karaoke,Arial,36,&H0036C8FF,&H00FFFFFF,&H00101010,&H96000000,1,0,0,0,100,100,0,0,1,3,1,2,90,90,58,1',
  'Style: Card,Arial,20,&H00FFFFFF,&H00FFFFFF,&H00A35C7C,&H00000000,1,0,0,0,100,100,1,0,3,8,0,8,520,260,14,1',
  'Style: CardActual,Arial,20,&H00FFFFFF,&H00FFFFFF,&H005C3BFF,&H00000000,1,0,0,0,100,100,1,0,3,8,0,8,520,260,14,1',
  'Style: CardExpected,Arial,20,&H00FFFFFF,&H00FFFFFF,&H007AD22F,&H00000000,1,0,0,0,100,100,1,0,3,8,0,8,520,260,14,1',
  'Style: Tag,Arial,16,&H00F0F0F0,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,1,0,3,5,0,1,22,22,18,1',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  `Dialogue: 0,${assTime(0)},${assTime(total)},Tag,,0,0,0,,BUG EVIDENCE · ${assText(script.id)}`,
  ...steps.flatMap((s, i) => {
    const style = s.kind === 'actual' ? 'CardActual' : s.kind === 'expected' ? 'CardExpected' : 'Card';
    return [
      `Dialogue: 1,${assTime(s.start)},${assTime(s.end)},${style},,0,0,0,,STEP ${i + 1}/${steps.length} · ${assText(s.card.toUpperCase())}`,
      `Dialogue: 2,${assTime(s.start)},${assTime(s.end)},Karaoke,,0,0,0,,${karaoke(s.say, s.clip.ms)}`,
    ];
  }),
  '',
].join('\n');
const assFile = join(dir, 'subtitles.ass');
writeFileSync(assFile, ass);

// Plain captions for the web player (<track kind="captions">), one cue per sentence.
const vttTime = (ms) => assTime(ms).replace(/^(\d):/, '0$1:').replace(/\.(\d\d)$/, '.$10');
writeFileSync(
  join(OUT, `${script.id}.vtt`),
  ['WEBVTT', '', ...steps.map((s, i) => `${i + 1}\n${vttTime(s.start)} --> ${vttTime(Math.min(s.start + s.clip.ms + 300, s.end))}\n${s.say}\n`)].join('\n'),
);

// ---------- video: subtitles + progress bar + narration ----------

const clips = steps.map((s) => s.clip.file);
const audio = steps.map((s, i) => `[${i + 1}:a]adelay=${s.start}|${s.start}[a${i}]`).join(';');
const filter = [
  `[0:v]ass=${assFile},drawbox=x=0:y=ih-6:w=iw*t/${(total / 1000).toFixed(2)}:h=6:color=0x7c5cff@0.95:t=fill[v]`,
  audio,
  `${steps.map((_, i) => `[a${i}]`).join('')}amix=inputs=${steps.length}:normalize=0:duration=longest[a]`,
].join(';');
const mp4 = join(OUT, `${script.id}.mp4`);
execFileSync(
  FFMPEG,
  ['-y', '-loglevel', 'error', '-i', join(dir, 'video.webm'), ...clips.flatMap((c) => ['-i', c]), '-filter_complex', filter,
    '-map', '[v]', '-map', '[a]', '-t', (total / 1000).toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4],
  { stdio: 'inherit' },
);

// Poster: one second into the "actual" step, where the bug is on screen.
const actual = steps.find((s) => s.kind === 'actual') ?? steps.at(-1);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', ((actual.start + 1000) / 1000).toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '4', join(OUT, `${script.id}.jpg`)]);

// ---------- reel: the same evidence as a vertical 9:16 video for the portfolio's reel strip ----------
// The recording sits in the middle; the karaoke line gets the space below it, large enough to read on a phone.

const RW = 720, RH = 1280, VIDEO_Y = 300;
const reelAss = [
  '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${RW}`, `PlayResY: ${RH}`, 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  'Style: Head,Arial,26,&H00B0A093,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,3,0,1,0,0,8,40,40,90,1',
  'Style: Title,Arial,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,8,40,40,135,1',
  'Style: Card,Arial,26,&H00FFFFFF,&H00FFFFFF,&H00A35C7C,&H00000000,1,0,0,0,100,100,1,0,3,10,0,8,40,40,745,1',
  'Style: CardActual,Arial,26,&H00FFFFFF,&H00FFFFFF,&H005C3BFF,&H00000000,1,0,0,0,100,100,1,0,3,10,0,8,40,40,745,1',
  'Style: CardExpected,Arial,26,&H00FFFFFF,&H00FFFFFF,&H007AD22F,&H00000000,1,0,0,0,100,100,1,0,3,10,0,8,40,40,745,1',
  'Style: Karaoke,Arial,46,&H0036C8FF,&H00FFFFFF,&H00101010,&H00000000,1,0,0,0,100,100,0,0,1,3,0,8,50,50,840,1',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  `Dialogue: 0,${assTime(0)},${assTime(total)},Head,,0,0,0,,BUG EVIDENCE`,
  `Dialogue: 0,${assTime(0)},${assTime(total)},Title,,0,0,0,,${assText(script.title)}`,
  ...steps.flatMap((s, i) => {
    const style = s.kind === 'actual' ? 'CardActual' : s.kind === 'expected' ? 'CardExpected' : 'Card';
    return [
      `Dialogue: 1,${assTime(s.start)},${assTime(s.end)},${style},,0,0,0,,STEP ${i + 1}/${steps.length} · ${assText(s.card.toUpperCase())}`,
      `Dialogue: 2,${assTime(s.start)},${assTime(s.end)},Karaoke,,0,0,0,,${karaoke(s.say, s.clip.ms)}`,
    ];
  }),
  '',
].join('\n');
const reelAssFile = join(dir, 'reel.ass');
writeFileSync(reelAssFile, reelAss);
const REELS = join('site', 'reels');
mkdirSync(REELS, { recursive: true });
const reel = join(REELS, `${script.id}.mp4`);
execFileSync(
  FFMPEG,
  ['-y', '-loglevel', 'error', '-i', join(dir, 'video.webm'), ...clips.flatMap((c) => ['-i', c]), '-filter_complex',
    [`[0:v]scale=${RW}:-2,pad=${RW}:${RH}:0:${VIDEO_Y}:color=0x0b0f17,ass=${reelAssFile},drawbox=x=0:y=ih-8:w=iw*t/${(total / 1000).toFixed(2)}:h=8:color=0x7c5cff@0.95:t=fill[v]`,
      audio, `${steps.map((_, i) => `[a${i}]`).join('')}amix=inputs=${steps.length}:normalize=0:duration=longest[a]`].join(';'),
    '-map', '[v]', '-map', '[a]', '-t', (total / 1000).toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', reel],
  { stdio: 'inherit' },
);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', ((actual.start + 1000) / 1000).toFixed(2), '-i', reel, '-frames:v', '1', '-q:v', '5', join(REELS, `${script.id}.jpg`)]);

// ---------- bug report (team template) + registry ----------

const step = (k) => steps.find((s) => s.kind === k)?.say.replace(/^(Actual|Expected) result:\s*/i, '') ?? '';
const reproSteps = steps.filter((s) => !s.kind && s.key !== 'intro').map((s) => s.say);
const report = {
  id: script.id,
  title: script.title,
  signature: script.signature,
  ...script.report,
  steps: reproSteps,
  actual: step('actual'),
  expected: step('expected'),
  video: `${script.id}.mp4`,
  captions: `${script.id}.vtt`,
  poster: `${script.id}.jpg`,
  durationMs: total,
  recorded: new Date().toISOString().slice(0, 10),
};
writeFileSync(join(OUT, `${script.id}.json`), JSON.stringify(report, null, 2));
// The gallery page (site/evidence/index.html) lists every report named here.
const indexFile = join(OUT, 'index.json');
const ids = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : [];
if (!ids.includes(script.id)) ids.push(script.id);
writeFileSync(indexFile, `${JSON.stringify(ids, null, 2)}\n`);

const regFile = join('evidence', 'registry.json');
const registry = existsSync(regFile) ? JSON.parse(readFileSync(regFile, 'utf8')) : { bugs: [] };
const entry = registry.bugs.find((b) => b.signature === script.signature);
const occurrence = { date: report.recorded, ref: script.id, env: 'local demo' };
if (entry) {
  entry.matches = script.matches ?? entry.matches ?? [];
  entry.evidence = `site/evidence/${script.id}.mp4`;
  if (!entry.occurrences.some((o) => o.date === occurrence.date && o.ref === occurrence.ref)) entry.occurrences.push(occurrence);
} else {
  registry.bugs.push({ id: script.id, signature: script.signature, title: script.title, status: 'open', matches: script.matches ?? [], evidence: `site/evidence/${script.id}.mp4`, occurrences: [occurrence] });
}
writeFileSync(regFile, `${JSON.stringify(registry, null, 2)}\n`);

console.log(`evidence: ${mp4} + reel ${reel} (${(total / 1000).toFixed(1)} s), captions, posters, report, registry updated`);
