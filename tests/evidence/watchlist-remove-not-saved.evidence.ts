// Evidence video for the injected defect `watchlist-remove-not-saved` (see site/demo/store.js).
// Not part of the normal run: EVIDENCE=1 adds the `evidence` project. Full pipeline: npm run evidence
// The regression test "a removal survives a reload" (tests/ui/watchlist.spec.ts) is the one that catches this bug;
// this script re-verifies it and records how to reproduce it.
import { test, expect } from '../fixtures';
import { BoardPage, LoginPage, WatchlistPage } from '../pages';
import { FROZEN_QUERY, users } from '../data';
import { EvidenceRecorder } from './recorder';

const SCRIPT = 'evidence/scripts/watchlist-remove-not-saved.json';
const [KEEP, DROP] = ['ACB', 'FPT'];

test('@regression evidence: a removed watchlist stock comes back after a reload', async ({ browser }) => {
  test.setTimeout(120_000);
  const rec = new EvidenceRecorder(SCRIPT);
  const page = await rec.open(browser);
  const login = new LoginPage(page);
  const board = new BoardPage(page);
  const watchlist = new WatchlistPage(page);
  const query = `${FROZEN_QUERY}&defect=${rec.script.defect}`;

  try {
    await rec.step('intro', () => login.open(query));
    await rec.step('login', async () => {
      await login.email.fill(users.qa.email);
      await login.password.fill(users.qa.password);
      await rec.spotlight(login.submit);
      await login.submit.click();
      await expect(board.heading).toBeVisible();
    });
    await rec.step('add', async () => {
      for (const t of [KEEP, DROP]) {
        await rec.spotlight(board.addToWatchlist(t));
        await board.addToWatchlist(t).click();
        await expect(board.removeFromWatchlist(t)).toBeVisible();
      }
    });
    await rec.step('open', async () => {
      await rec.spotlight(board.watchlistLink);
      await board.watchlistLink.click();
      await expect(watchlist.tickers).toHaveText([KEEP, DROP]);
    });
    await rec.step('remove', async () => {
      await rec.spotlight(watchlist.remove(DROP));
      await watchlist.remove(DROP).click();
      await expect(watchlist.row(DROP)).toHaveCount(0);
      await expect(watchlist.count).toHaveText('1 stock');
    });
    await rec.step('reload', () => page.reload().then(() => undefined));
    await rec.step('actual', async () => {
      // The bug reproduces: the stock is back. If this fails, the defect is gone — do not publish the video.
      await expect(watchlist.row(DROP)).toHaveCount(1);
      await rec.spotlight(watchlist.row(DROP).getByRole('link', { name: DROP }));
    });
    await rec.step('expected');
  } finally {
    await rec.finish();
  }
});
