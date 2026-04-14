import { Page, Locator } from '@playwright/test';

/**
 * Reusable form component abstraction for OrangeHRM forms.
 */
export class FormComponent {
  private readonly form: Locator;

  constructor(page: Page, formSelector = 'form') {
    this.form = page.locator(formSelector);
  }

  async fillInput(label: string, value: string): Promise<void> {
    await this.form.getByLabel(label).fill(value);
  }

  async selectOption(label: string, option: string): Promise<void> {
    await this.form.getByLabel(label).selectOption(option);
  }

  async submit(): Promise<void> {
    await this.form.getByRole('button', { name: /save|submit/i }).click();
  }

  async reset(): Promise<void> {
    await this.form.getByRole('button', { name: /reset|clear/i }).click();
  }
}
