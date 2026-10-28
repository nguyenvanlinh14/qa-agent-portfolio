// Vertical 9:16 screen recordings for the reel strip on the home page: the live run dashboard replaying the last run,
// and the exported k6 dashboard. Both pages are responsive, so they are recorded at a phone-sized viewport.
//   npm run build && npm run serve      # terminal 1 (dist/ must contain live/latest-run.jsonl and perf/*.html)
//   FFMPEG=/path/to/ffmpeg node scripts/reels/record-reels.mjs
// The bug-evidence reel is made by scripts/evidence/build-video.mjs (it needs the narration).
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const SITE = process.env.SITE_URL ?? 'https://nguyenvanlinh14.github.io/qa-agent-portfolio/';
const OUT = join('site', 'reels');
const TMP = join('reports', 'reels-raw');
const VIEW = { width: 540, height: 960 };

/** Scrolls the page to `y` over `ms`, so the viewer can follow (a jump would look like a cut). */
async function glide(page, y, ms) {
  await page.evaluate(
    ([to, dur]) =>
      new Promise((done) => {
        const from = scrollY, t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur);
          scrollTo(0, from + (to - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
}

const top = (page, testId) => page.getByTestId(testId).evaluate((el) => el.getBoundingClientRect().top + scrollY - 70);

const REELS = [
  {
    id: 'live-run',
    // ?site=: the address bar shows the public page, not the local server the reel was recorded on.
    url: `${BASE}/live/?src=latest-run.jsonl&speed=3&site=${encodeURIComponent(SITE)}`,
    async play(page) {
      await page.waitForTimeout(4500); // progress bar and counters fill up
      await glide(page, await top(page, 'browser'), 1500);
      await page.waitForTimeout(5500); // pages flip in the browser view
      await glide(page, await top(page, 'finished'), 1800);
      await page.waitForTimeout(3500);
    },
  },
  {
    id: 'k6-dashboard',
    url: `${BASE}/perf/${process.env.K6_REEL ?? 'k6-spike-dashboard.html'}`,
    async play(page) {
      await page.waitForTimeout(2500);
      const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await glide(page, Math.min(h, 2600), 12_000);
      await page.waitForTimeout(2000);
    },
  },
];

rmSync(TMP, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const reel of REELS) {
  const dir = join(TMP, reel.id);
  const context = await browser.newContext({ viewport: VIEW, colorScheme: 'dark', recordVideo: { dir, size: VIEW } });
  const page = await context.newPage();
  await page.goto(reel.url);
  await reel.play(page);
  await context.close();
  const webm = join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
  const mp4 = join(OUT, `${reel.id}.mp4`);
  // Drop the first half second (blank page while loading), scale to 720×1280, no audio track.
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', '0.5', '-i', webm, '-vf', 'scale=720:1280:flags=lanczos', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', '5', '-i', mp4, '-frames:v', '1', '-q:v', '5', join(OUT, `${reel.id}.jpg`)]);
  console.log(`reel: ${mp4}`);
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
