import { test, expect } from '../fixtures';
import { users } from '../data/factories';
import { DISCLAIMER, expectedRow } from '../data/market';

test.describe('Watchlist', () => {
  test('@smoke an empty watchlist explains how to add stocks', async ({ watchlistPage }) => {
    await watchlistPage.open();
    await expect(watchlistPage.heading).toBeVisible();
    await expect(watchlistPage.emptyState).toContainText('Your watchlist is empty');
    await expect(watchlistPage.count).toHaveText('0 stocks');
    await expect(watchlistPage.table).toBeHidden();
  });

  test('@smoke a stock starred on the board appears on the watchlist', async ({ boardPage, watchlistPage }) => {
    await boardPage.open();
    await boardPage.addToWatchlist('ACB').click();
    await boardPage.watchlistLink.click();
    await expect(watchlistPage.tickers).toHaveText(['ACB']);
    await expect(watchlistPage.count).toHaveText('1 stock');
  });

  test('@regression the watchlist lists stocks in the order they were added with their prices', async ({ watchlistPage }) => {
    await watchlistPage.openWith(users.qa.email, ['VNM', 'ACB']);
    await expect(watchlistPage.tickers).toHaveText(['VNM', 'ACB']);
    await expect(watchlistPage.row('ACB').getByTestId('last')).toHaveText(expectedRow('ACB').text.last);
  });

  test('@regression the count follows the number of stocks', async ({ watchlistPage }) => {
    await watchlistPage.openWith(users.qa.email, ['ACB', 'FPT', 'VNM']);
    await expect(watchlistPage.count).toHaveText('3 stocks');
  });

  test('@smoke removing a stock takes it off the list', async ({ watchlistPage }) => {
    await watchlistPage.openWith(users.qa.email, ['ACB', 'FPT']);
    await watchlistPage.remove('ACB').click();
    await expect(watchlistPage.tickers).toHaveText(['FPT']);
    await expect(watchlistPage.count).toHaveText('1 stock');
  });

  test('@regression removing the last stock shows the empty state', async ({ watchlistPage }) => {
    await watchlistPage.openWith(users.qa.email, ['ACB']);
    await watchlistPage.remove('ACB').click();
    await expect(watchlistPage.emptyState).toBeVisible();
    await expect(watchlistPage.count).toHaveText('0 stocks');
  });

  test('@regression the watchlist survives a reload', async ({ watchlistPage, page }) => {
    await watchlistPage.openWith(users.qa.email, ['HPG', 'MWG']);
    await page.reload();
    await expect(watchlistPage.tickers).toHaveText(['HPG', 'MWG']);
  });

  test('@regression a removal survives a reload', async ({ watchlistPage, page }) => {
    await watchlistPage.openWith(users.qa.email, ['HPG', 'MWG']);
    await watchlistPage.remove('HPG').click();
    await page.reload();
    await expect(watchlistPage.tickers).toHaveText(['MWG']);
  });

  test('@regression a watchlist belongs to its user', async ({ watchlistPage }) => {
    await watchlistPage.openWith(users.dev.email, ['ACB']);
    await expect(watchlistPage.emptyState).toBeVisible();
  });

  test('@regression the nav marks the watchlist as the current page and shows the disclaimer', async ({ watchlistPage }) => {
    await watchlistPage.open();
    await expect(watchlistPage.watchlistLink).toHaveAttribute('aria-current', 'page');
    await expect(watchlistPage.disclaimer).toHaveText(DISCLAIMER);
  });
});
