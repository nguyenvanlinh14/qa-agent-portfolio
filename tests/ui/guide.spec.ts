import { test, expect } from '../fixtures';
import { GUIDE_CLIPS, GUIDE_FIRST, GUIDE_LANGS, GUIDE_LAST, GUIDE_NAME, GUIDE_SECOND, GUIDE_STEPS, guideCount } from '../data/guide';

test.describe('Portfolio guide (Tess)', () => {
  test.use({ locale: 'en-US' });

  test('@smoke the launcher opens the tour at the first stop', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await expect(guidePage.panel).toBeVisible();
    await expect(guidePage.name).toHaveText(GUIDE_NAME);
    await expect(guidePage.stepCount).toHaveText(guideCount(0));
    await expect(guidePage.caption).toHaveText(GUIDE_FIRST.say.en);
  });

  test('@regression the launcher is hidden while the tour is open', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await expect(guidePage.launcher).toBeHidden();
  });

  test('@regression next moves to the second stop and highlights its section', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await guidePage.next.click();
    await expect(guidePage.stepTitle).toHaveText(GUIDE_SECOND.title.en);
    await expect(guidePage.focusedSection).toHaveAttribute('data-guide-focus', GUIDE_SECOND.id);
  });

  test('@regression previous is disabled on the first stop and next on the last', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await expect(guidePage.prev).toBeDisabled();
    await guidePage.stop(GUIDE_LAST.title.en).click();
    await expect(guidePage.stepCount).toHaveText(guideCount(GUIDE_STEPS.length - 1));
    await expect(guidePage.next).toBeDisabled();
  });

  test('@regression the stop list has one entry per stop and marks the current one', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await expect(guidePage.stops).toHaveCount(GUIDE_STEPS.length);
    await expect(guidePage.stop(GUIDE_FIRST.title.en)).toHaveAttribute('aria-current', 'step');
  });

  test('@regression switching to VI shows the Vietnamese caption', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await guidePage.language('vi').click();
    await expect(guidePage.language('vi')).toHaveAttribute('aria-pressed', 'true');
    await expect(guidePage.caption).toHaveText(GUIDE_FIRST.say.vi);
  });

  test.describe('with a Vietnamese browser', () => {
    test.use({ locale: 'vi-VN' });

    test('@regression the tour starts in Vietnamese', async ({ guidePage }) => {
      await guidePage.goto();
      await guidePage.open();
      await expect(guidePage.caption).toHaveText(GUIDE_FIRST.say.vi);
    });
  });

  test('@regression the language choice is remembered after a reload', async ({ page, guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await guidePage.language('vi').click();
    await page.reload();
    await guidePage.open();
    await expect(guidePage.caption).toHaveText(GUIDE_FIRST.say.vi);
  });

  test('@regression pause and play toggle the play button label', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await expect(guidePage.play).toHaveAccessibleName('Pause');
    await guidePage.play.click();
    await expect(guidePage.play).toHaveAccessibleName('Play');
  });

  test('@regression the voice can be switched off', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await guidePage.sound.click();
    await expect(guidePage.sound).toHaveAttribute('aria-pressed', 'false');
  });

  test('@regression close hides the panel, clears the highlight and returns focus to the launcher', async ({ guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await guidePage.close.click();
    await expect(guidePage.panel).toBeHidden();
    await expect(guidePage.focusedSection).toHaveCount(0);
    await expect(guidePage.launcher).toBeFocused();
  });

  test('@regression Escape closes the tour', async ({ page, guidePage }) => {
    await guidePage.goto();
    await guidePage.open();
    await page.keyboard.press('Escape');
    await expect(guidePage.panel).toBeHidden();
  });

  test('@regression the #tour link opens the guide on load', async ({ guidePage }) => {
    await guidePage.gotoTour();
    await expect(guidePage.panel).toBeVisible();
  });

  test('@regression the open tour has no accessibility violations', async ({ guidePage, axe }) => {
    await guidePage.goto();
    await guidePage.open();
    await expect(guidePage.panel).toBeVisible();
    const { violations } = await axe().include('#guide-panel').analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('@regression every stop has a voice clip in each language and every clip is served', async ({ request }) => {
    expect(GUIDE_CLIPS).toHaveLength(GUIDE_STEPS.length * GUIDE_LANGS.length);
    for (const clip of GUIDE_CLIPS) await expect(await request.get(`/guide/${clip.file}`), `${clip.lang}/${clip.id}`).toBeOK();
  });
});
