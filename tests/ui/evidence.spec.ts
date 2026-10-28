import { test, expect } from '../fixtures';
import { EVIDENCE_BUG } from '../data/live';

test.describe('Bug evidence', () => {
  test('@smoke the bug video is published with English captions', async ({ evidencePage }) => {
    await evidencePage.goto();
    await expect(evidencePage.heading).toBeVisible();
    await expect(evidencePage.video(EVIDENCE_BUG.id).locator('source')).toHaveAttribute('src', `${EVIDENCE_BUG.id}.mp4`);
    await expect(evidencePage.captions(EVIDENCE_BUG.id)).toHaveAttribute('srclang', 'en');
  });

  test('@regression the report follows the team template', async ({ evidencePage }) => {
    await evidencePage.goto();
    await expect(evidencePage.entry(EVIDENCE_BUG.id)).toContainText(EVIDENCE_BUG.title);
    for (const row of EVIDENCE_BUG.reportRows) await expect(evidencePage.reportRow(EVIDENCE_BUG.id, row)).toBeVisible();
  });

  test('@regression the video file and its captions are served', async ({ request }) => {
    for (const ext of ['mp4', 'vtt']) {
      const res = await request.get(`/evidence/${EVIDENCE_BUG.id}.${ext}`);
      expect(res.status(), `${EVIDENCE_BUG.id}.${ext}`).toBe(200);
    }
  });
});
