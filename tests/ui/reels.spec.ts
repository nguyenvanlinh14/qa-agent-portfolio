import { test, expect } from '../fixtures';
import { REELS } from '../data/live';

test.describe('Home: live, evidence and reels', () => {
  test('@smoke the main nav links to the live run and the bug evidence', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.navLive).toHaveAttribute('href', 'live/');
    await expect(homePage.navEvidence).toHaveAttribute('href', 'evidence/');
  });

  test('@regression the reel strip shows the evidence, live run and k6 reels in order', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.reels).toHaveCount(REELS.length);
    for (const [i, r] of REELS.entries()) await expect(homePage.reels.nth(i)).toHaveAttribute('data-reel', r.kind);
  });

  test('@regression each reel links to the page it shows', async ({ homePage }) => {
    await homePage.goto();
    for (const r of REELS) await expect(homePage.reel(r.kind).getByRole('link')).toHaveAttribute('href', r.href);
  });

  test('@regression reels start muted and play inline, without loading until needed', async ({ homePage }) => {
    await homePage.goto();
    for (const r of REELS) {
      const video = homePage.reel(r.kind).locator('video');
      await expect(video).toHaveJSProperty('muted', true);
      await expect(video).toHaveAttribute('playsinline', '');
      await expect(video).toHaveAttribute('preload', 'none');
    }
  });

  test('@regression only the narrated reel has a sound button, and it turns the sound on', async ({ homePage }) => {
    await homePage.goto();
    for (const r of REELS) await expect(homePage.reel(r.kind).getByRole('button')).toHaveCount(r.sound ? 1 : 0);
    const sound = homePage.reel('evidence').getByRole('button', { name: 'Turn sound on' });
    await sound.click();
    await expect(homePage.reel('evidence').getByRole('button', { name: 'Turn sound off' })).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.reel('evidence').locator('video')).toHaveJSProperty('muted', false);
  });

  test('@regression with reduced motion the reels do not autoplay and show their controls', async ({ page, homePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await homePage.goto();
    for (const r of REELS) await expect(homePage.reel(r.kind).locator('video')).toHaveJSProperty('controls', true);
  });

  test('@regression the reel videos and posters are served', async ({ request, homePage }) => {
    await homePage.goto();
    for (const r of REELS) {
      const video = homePage.reel(r.kind).locator('video');
      for (const src of [await video.getAttribute('poster'), await video.locator('source').getAttribute('src')]) {
        expect((await request.get(`/${src}`)).status(), `${src}`).toBe(200);
      }
    }
  });
});
