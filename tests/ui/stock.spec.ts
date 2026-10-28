import { test, expect } from '../fixtures';
import { alertLabel, anAlert, invalidAlertPrices } from '../data/alert-builder';
import { DISCLAIMER, expectedRow, fmtMcap, stock } from '../data/market';

test.describe('Stock detail', () => {
  test('@smoke the header shows the ticker, company, last price and change', async ({ stockPage }) => {
    const row = expectedRow('ACB');
    await stockPage.openTicker('ACB');
    await expect(stockPage.ticker).toHaveText('ACB');
    await expect(stockPage.companyName).toHaveText(row.name);
    await expect(stockPage.last).toHaveText(row.text.last);
    await expect(stockPage.change).toHaveText(`${row.text.chg} (${row.text.pct})`);
  });

  test('@smoke the chart draws 60 candles', async ({ stockPage }) => {
    await stockPage.openTicker('ACB');
    await expect(stockPage.chart).toBeVisible();
    await expect(stockPage.candles).toHaveCount(60);
  });

  for (const ticker of ['ACB', 'VIC']) {
    test(`@regression ${ticker}: ceiling and floor are reference x 1.07 / x 0.93 rounded to the tick`, async ({ stockPage }) => {
      const row = expectedRow(ticker);
      await stockPage.openTicker(ticker);
      await expect(stockPage.stat('ref')).toHaveText(row.text.ref);
      await expect(stockPage.stat('ceil')).toHaveText(row.text.ceil);
      await expect(stockPage.stat('floor')).toHaveText(row.text.floor);
    });
  }

  test('@regression the key statistics show P/E, market cap and sector', async ({ stockPage }) => {
    const acb = stock('ACB');
    await stockPage.openTicker('ACB');
    await expect(stockPage.stat('pe')).toHaveText(acb.pe.toFixed(1));
    await expect(stockPage.stat('mcap')).toHaveText(`${fmtMcap(acb.mcap)} bn`);
    await expect(stockPage.stat('sector')).toHaveText(acb.sector);
  });

  test('@regression a stock at its ceiling is labelled Ceiling', async ({ stockPage }) => {
    await stockPage.openTicker('ACB');
    await expect(stockPage.state).toHaveText('Ceiling');
  });

  test('@regression a stock at its floor is labelled Floor', async ({ stockPage }) => {
    await stockPage.openTicker('MBB');
    await expect(stockPage.state).toHaveText('Floor');
  });

  test('@regression the ticker in the URL is case-insensitive', async ({ stockPage }) => {
    await stockPage.openTicker('acb');
    await expect(stockPage.ticker).toHaveText('ACB');
  });

  test('@regression an unknown ticker shows a not-found message', async ({ stockPage }) => {
    await stockPage.openTicker('ZZZ');
    await expect(stockPage.notFoundHeading).toBeVisible();
  });

  test('@regression the demo disclaimer is visible', async ({ stockPage }) => {
    await stockPage.openTicker('ACB');
    await expect(stockPage.disclaimer).toHaveText(DISCLAIMER);
  });

  test.describe('watchlist button', () => {
    test('@smoke adds the stock to the watchlist', async ({ stockPage }) => {
      await stockPage.openTicker('ACB');
      await stockPage.addToWatchlist.click();
      await expect(stockPage.removeFromWatchlist).toBeVisible();
    });

    test('@regression the choice persists after a reload', async ({ stockPage, page }) => {
      await stockPage.openTicker('ACB');
      await stockPage.addToWatchlist.click();
      await page.reload();
      await expect(stockPage.removeFromWatchlist).toBeVisible();
    });
  });

  test.describe('price alerts', () => {
    test.beforeEach(async ({ stockPage }) => {
      await stockPage.openTicker('ACB');
    });

    for (const [name, { input, message }] of Object.entries(invalidAlertPrices)) {
      test(`@regression an invalid alert price is rejected (${name})`, async ({ stockPage }) => {
        await stockPage.alertPrice.fill(input);
        await stockPage.addAlert.click();
        await expect(stockPage.alertError).toHaveText(message);
        await expect(stockPage.alerts).toHaveCount(0);
      });
    }

    test('@smoke a valid alert is listed', async ({ stockPage }) => {
      const alert = anAlert().above().atPrice('30.00').build();
      await stockPage.setAlert(alert);
      await expect(stockPage.alerts).toContainText([alertLabel(alert)]);
      await expect(stockPage.alertPrice).toBeEmpty();
    });

    test('@regression a below alert is listed with its direction', async ({ stockPage }) => {
      const alert = anAlert().below().atPrice('23.50').build();
      await stockPage.setAlert(alert);
      await expect(stockPage.alerts).toContainText([alertLabel(alert)]);
    });

    test('@regression a valid alert clears an earlier error', async ({ stockPage }) => {
      await stockPage.addAlert.click();
      await expect(stockPage.alertError).toBeVisible();
      await stockPage.setAlert(anAlert().build());
      await expect(stockPage.alertError).toBeHidden();
    });

    test('@regression a price with one or two decimals is accepted', async ({ stockPage }) => {
      const alert = anAlert().atPrice('24.5').build();
      await stockPage.setAlert(alert);
      await expect(stockPage.alerts).toContainText([alertLabel(alert)]);
    });

    test('@smoke deleting an alert removes it', async ({ stockPage }) => {
      const alert = anAlert().build();
      await stockPage.setAlert(alert);
      await stockPage.deleteAlert(alertLabel(alert)).click();
      await expect(stockPage.alerts).toHaveCount(0);
      await expect(stockPage.noAlerts).toBeVisible();
    });

    test('@regression alerts survive a reload', async ({ stockPage, page }) => {
      const alert = anAlert().below().atPrice('22.00').build();
      await stockPage.setAlert(alert);
      await page.reload();
      await expect(stockPage.alerts).toContainText([alertLabel(alert)]);
    });

    test('@regression alerts belong to their ticker', async ({ stockPage }) => {
      await stockPage.setAlert(anAlert().build());
      await stockPage.openTicker('FPT');
      await expect(stockPage.noAlerts).toBeVisible();
    });
  });
});
