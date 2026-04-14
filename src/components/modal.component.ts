import { Page, Locator, expect } from '@playwright/test';

/**
 * Reusable modal component abstraction.
 */
export class ModalComponent {
  private readonly modal: Locator;

  constructor(page: Page, modalSelector = '.oxd-dialog-container') {
    this.modal = page.locator(modalSelector);
  }

  async assertVisible(): Promise<void> {
    await expect(this.modal).toBeVisible();
  }

  async assertHidden(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }

  async clickConfirm(): Promise<void> {
    await this.modal.getByRole('button', { name: /confirm|yes|ok/i }).click();
  }

  async clickCancel(): Promise<void> {
    await this.modal.getByRole('button', { name: /cancel|no/i }).click();
  }

  async getTitle(): Promise<string> {
    return this.modal.locator('.oxd-dialog-title').innerText();
  }
}
