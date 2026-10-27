import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export type TodoFilter = 'All' | 'Active' | 'Done';

export class TodoPage extends BasePage {
  readonly path = '/demo/todos.html';

  readonly heading: Locator;
  readonly currentUser: Locator;
  readonly newTodo: Locator;
  readonly addButton: Locator;
  readonly list: Locator;
  readonly items: Locator;
  readonly emptyState: Locator;
  readonly remaining: Locator;
  readonly signOut: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'My todos' });
    this.currentUser = page.getByTestId('current-user');
    this.newTodo = page.getByLabel('New todo', { exact: true });
    this.addButton = page.getByRole('button', { name: 'Add', exact: true });
    this.list = page.getByRole('list', { name: 'Todo list' });
    this.items = this.list.getByRole('listitem');
    this.emptyState = page.getByText('Nothing here yet');
    this.remaining = page.getByTestId('remaining');
    this.signOut = page.getByRole('button', { name: 'Sign out' });
  }

  /** Opens the page with an empty todo list (the demo keeps todos in localStorage). */
  async open(): Promise<void> {
    await this.goto();
    await this.page.evaluate(() => localStorage.removeItem('taskflow.todos'));
    await this.page.reload();
  }

  async add(title: string): Promise<void> {
    await this.newTodo.fill(title);
    await this.addButton.click();
  }

  item(title: string): Locator {
    return this.items.filter({ hasText: title });
  }

  async toggle(title: string): Promise<void> {
    await this.page.getByRole('checkbox', { name: `Toggle ${title}`, exact: true }).click();
  }

  async remove(title: string): Promise<void> {
    await this.page.getByRole('button', { name: `Delete ${title}`, exact: true }).click();
  }

  async filter(name: TodoFilter): Promise<void> {
    await this.page.getByRole('button', { name, exact: true }).click();
  }
}
