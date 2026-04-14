import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { URLS, MESSAGES } from '../constants';

export class LoginPage extends BasePage {
  private readonly usernameInput = this.page.getByPlaceholder('Username');
  private readonly passwordInput = this.page.getByPlaceholder('Password');
  private readonly loginButton   = this.page.getByRole('button', { name: 'Login' });
  private readonly errorMessage  = this.page.locator('.oxd-alert-content-text');

  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.navigate(URLS.LOGIN);
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard/index');
  }

  async loginExpectError(username: string, password: string): Promise<string> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await expect(this.errorMessage).toBeVisible();
    return this.errorMessage.innerText();
  }

  async assertErrorVisible(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(MESSAGES.INVALID_CREDENTIALS);
  }
}
