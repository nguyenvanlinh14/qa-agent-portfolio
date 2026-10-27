import { test, expect } from '../fixtures';

test.describe('Lessons', () => {
  test('@smoke opening a lesson card shows the lesson with a next link', async ({ page, homePage, lessonPage }) => {
    await homePage.goto();
    await homePage.lessonCards.first().click();
    await expect(page).toHaveURL(/\/lessons\/.+\.html$/);
    await expect(lessonPage.content).toBeVisible();
    await expect(lessonPage.nextLink).toBeVisible();
  });
});
