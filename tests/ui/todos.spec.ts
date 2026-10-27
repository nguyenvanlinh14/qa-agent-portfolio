import { test, expect } from '../fixtures';
import { aTodo } from '../data';

test.describe('Todos', () => {
  test.beforeEach(async ({ todoPage }) => {
    await todoPage.open();
  });

  test('@smoke adding a todo lists it', async ({ todoPage }) => {
    const { title } = aTodo().build();
    await todoPage.add(title);
    await expect(todoPage.item(title)).toBeVisible();
    await expect(todoPage.newTodo).toBeEmpty();
  });

  test('@smoke toggling a todo marks it done', async ({ todoPage }) => {
    const { title } = aTodo().build();
    await todoPage.add(title);
    await todoPage.toggle(title);
    await expect(todoPage.item(title)).toHaveClass(/done/);
  });

  test('@regression deleting a todo removes it', async ({ todoPage }) => {
    const { title } = aTodo().build();
    await todoPage.add(title);
    await todoPage.remove(title);
    await expect(todoPage.item(title)).toHaveCount(0);
    await expect(todoPage.emptyState).toBeVisible();
  });

  test('@regression active filter hides done todos', async ({ todoPage }) => {
    const open = aTodo().withPrefix('Open').build().title;
    const finished = aTodo().withPrefix('Finished').build().title;
    await todoPage.add(open);
    await todoPage.add(finished);
    await todoPage.toggle(finished);
    await todoPage.filter('Active');
    await expect(todoPage.item(open)).toBeVisible();
    await expect(todoPage.item(finished)).toHaveCount(0);
  });

  test('@regression done filter shows only done todos', async ({ todoPage }) => {
    const open = aTodo().withPrefix('Open').build().title;
    const finished = aTodo().withPrefix('Finished').build().title;
    await todoPage.add(open);
    await todoPage.add(finished);
    await todoPage.toggle(finished);
    await todoPage.filter('Done');
    await expect(todoPage.item(finished)).toBeVisible();
    await expect(todoPage.item(open)).toHaveCount(0);
  });

  test('@regression remaining counter tracks open todos', async ({ todoPage }) => {
    const first = aTodo().build().title;
    const second = aTodo().build().title;
    await expect(todoPage.remaining).toHaveText('0 items left');
    await todoPage.add(first);
    await expect(todoPage.remaining).toHaveText('1 item left');
    await todoPage.add(second);
    await expect(todoPage.remaining).toHaveText('2 items left');
    await todoPage.toggle(first);
    await expect(todoPage.remaining).toHaveText('1 item left');
  });

  test('@regression blank title is not added', async ({ todoPage }) => {
    await todoPage.add('   ');
    await expect(todoPage.items).toHaveCount(0);
  });

  test('@regression todos survive a reload', async ({ page, todoPage }) => {
    const { title } = aTodo().build();
    await todoPage.add(title);
    await page.reload();
    await expect(todoPage.item(title)).toBeVisible();
  });
});
