import { test, expect } from '../fixtures';
import { unknownUser, users, wrongPasswordUser } from '../data/factories';

test.describe('Login (anonymous visitor)', () => {
  // Negative and positive login flows must not reuse the stored session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('@smoke valid credentials open the todo list', async ({ loginPage, todoPage }) => {
    await loginPage.login(users.qa);
    await loginPage.expectLoggedIn();
    await expect(todoPage.currentUser).toHaveText(users.qa.email);
  });

  test('@regression wrong password shows an error', async ({ loginPage, page }) => {
    await loginPage.login(wrongPasswordUser());
    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/demo\/$/);
  });

  test('@regression unknown user shows an error', async ({ loginPage }) => {
    await loginPage.login(unknownUser());
    await expect(loginPage.error).toHaveText('Invalid email or password');
  });

  test('@regression empty fields are rejected', async ({ loginPage }) => {
    await loginPage.submit.click();
    await expect(loginPage.error).toHaveText('Email and password are required');
  });

  test('@regression missing password is rejected', async ({ loginPage }) => {
    await loginPage.email.fill(users.qa.email);
    await loginPage.submit.click();
    await expect(loginPage.error).toHaveText('Email and password are required');
  });
});

test.describe('Login (stored session)', () => {
  test('@regression signed-in user is redirected away from the login page', async ({ loginPage, page }) => {
    await loginPage.goto();
    await expect(page).toHaveURL(/\/demo\/todos\.html$/);
  });

  test('@regression signing out returns to the login page', async ({ loginPage, todoPage, page }) => {
    await todoPage.open();
    await todoPage.signOut.click();
    await expect(page).toHaveURL(/\/demo\/(index\.html)?$/);
    await expect(loginPage.submit).toBeVisible();
  });
});
