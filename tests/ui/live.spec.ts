import { test, expect } from '../fixtures';
import { FAILING_RUN, SAMPLE_RUN_SRC } from '../data/live';

test.describe('Live run dashboard (replay)', () => {
  test('@smoke a finished replay shows the recorded totals', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src);
    await expect(livePage.done).toHaveText(String(FAILING_RUN.total));
    await expect(livePage.total).toHaveText(String(FAILING_RUN.total));
    await expect(livePage.passed).toHaveText(String(FAILING_RUN.passed));
    await expect(livePage.failed).toHaveText(String(FAILING_RUN.failed));
    await expect(livePage.flaky).toHaveText(String(FAILING_RUN.flaky));
    await expect(livePage.skipped).toHaveText(String(FAILING_RUN.skipped));
  });

  test('@regression the progress bar reports every test as finished', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src);
    await expect(livePage.progress).toHaveAttribute('aria-valuemax', String(FAILING_RUN.total));
    await expect(livePage.progress).toHaveAttribute('aria-valuenow', String(FAILING_RUN.total));
  });

  test('@regression nothing is left running after the run ended', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src);
    await expect(livePage.mode).toContainText(FAILING_RUN.status);
    await expect(livePage.running).toHaveText('0');
  });

  test('@regression every failed attempt is listed with its error, including the one that passed on retry', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src);
    await expect(livePage.failures).toHaveCount(FAILING_RUN.failures.length);
    for (const title of FAILING_RUN.failures) await expect(livePage.failures.filter({ hasText: title })).toContainText('Error');
    await expect(livePage.noFailures).toBeHidden();
  });

  test('@regression each project of the run has its own row', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src);
    for (const p of FAILING_RUN.projects) await expect(livePage.projectRow(p)).toBeVisible();
  });

  test('@regression the replay can be restarted at a different speed', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src);
    await livePage.speed.selectOption('max');
    await livePage.replayButton.click();
    await expect(livePage.done).toHaveText(String(FAILING_RUN.total));
  });

  test('@regression the committed sample run replays to a passing state', async ({ livePage }) => {
    await livePage.replay(SAMPLE_RUN_SRC);
    await expect(livePage.mode).toContainText('passed');
    await expect(livePage.failed).toHaveText('0');
    await expect(livePage.noFailures).toBeVisible();
  });

  test('@regression the browser view shows the last tested page with its exact address', async ({ livePage, baseURL }) => {
    await livePage.replay(FAILING_RUN.src);
    const url = new URL(FAILING_RUN.lastPage.slice(1), `${baseURL}/`).href;
    await expect(livePage.browserUrl).toHaveText(url);
    await expect(livePage.browserUrl).toHaveAttribute('href', url);
    await expect(livePage.browserFrame).toBeVisible();
    await expect(livePage.browserStatus).toHaveText(FAILING_RUN.lastOutcome);
  });

  test('@regression a replay speed from the address that is not in the menu still plays the run', async ({ livePage }) => {
    await livePage.replay(FAILING_RUN.src, '3');
    await expect(livePage.speed).toHaveValue('3');
    await expect(livePage.done).toHaveText(String(FAILING_RUN.total));
  });
});
