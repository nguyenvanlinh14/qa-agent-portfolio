import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { Credentials } from '../data/factories';

export interface LiquidState {
  running: boolean;
  mode: 'live' | 'static';
  frames: number;
  blobs: number;
}

export class LoginPage extends BasePage {
  readonly path = '/demo/';

  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly showPassword: Locator;
  readonly hidePassword: Locator;
  readonly rememberMe: Locator;
  readonly submit: Locator;
  readonly error: Locator;
  readonly disclaimer: Locator;
  readonly liquidBackground: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'MarketFlow (demo)' });
    this.email = page.getByLabel('Email');
    // exact: the show/hide button's label also contains the word "password"
    this.password = page.getByLabel('Password', { exact: true });
    this.showPassword = page.getByRole('button', { name: 'Show password' });
    this.hidePassword = page.getByRole('button', { name: 'Hide password' });
    this.rememberMe = page.getByLabel('Remember me');
    this.submit = page.getByRole('button', { name: 'Sign in' });
    this.error = page.getByRole('alert');
    this.disclaimer = page.getByTestId('disclaimer');
    this.liquidBackground = page.getByTestId('liquid-bg');
  }

  /** Opens the login page; a query such as `?seed=42&frozen=1` is carried through to the board after signing in. */
  async open(query = ''): Promise<void> {
    await this.page.goto(`${this.path}${query}`);
  }

  async login({ email, password }: Credentials): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/demo\/board\.html/);
  }

  /** The hook from site/demo/liquid.js; null when the script did not run. */
  async liquidState(): Promise<LiquidState | null> {
    return this.page.evaluate(() => (window as unknown as { __liquid?: LiquidState }).__liquid ?? null);
  }
}
