import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { URLS } from '../constants';

export class LeavePage extends BasePage {
  private readonly leaveTypeDropdown = this.page.locator('.oxd-select-text').first();
  private readonly fromDateInput = this.page.locator('input[placeholder="yyyy-dd-mm"]').first();
  private readonly toDateInput = this.page.locator('input[placeholder="yyyy-dd-mm"]').last();
  private readonly applyButton = this.page.getByRole('button', { name: 'Apply' });

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate(URLS.LEAVE_MODULE);
  }

  async gotoApply(): Promise<void> {
    await this.navigate(URLS.APPLY_LEAVE);
  }

  /**
   * Applies leave if leave types are available. Returns false if no leave balance exists.
   */
  async applyLeave(leaveType: string, fromDate: string, toDate: string): Promise<boolean> {
    await this.navigate(URLS.APPLY_LEAVE);
    await this.page
      .locator('.oxd-form-loader')
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => {});

    // Demo site may show "No Leave Types with Leave Balance" — skip gracefully
    const noBalance = this.page.locator('text=No Leave Types with Leave Balance');
    if (await noBalance.isVisible({ timeout: 3_000 }).catch(() => false)) return false;

    await this.leaveTypeDropdown.click();
    await this.page.waitForTimeout(500);
    const specificOption = this.page.locator('.oxd-select-text-input');
    await specificOption.fill(leaveType.substring(0, 3));
    await this.page.waitForTimeout(500);
    const dropdownItem = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .first();
    try {
      await dropdownItem.click({ timeout: 3000 });
    } catch {
      await this.page.keyboard.press('Enter');
    }
    await this.fromDateInput.click({ clickCount: 3 });
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.click({ clickCount: 3 });
    await this.toDateInput.fill(toDate);
    await this.applyButton.click();
    await expect(this.page.locator('.oxd-toast')).toBeVisible();
    return true;
  }

  async assertLeaveTableVisible(): Promise<void> {
    await expect(this.page.locator('.oxd-table-body')).toBeVisible();
  }

  async navigateToMyLeave(): Promise<void> {
    await this.page.getByRole('link', { name: 'My Leave' }).click();
    await this.waitForLoad();
  }
}
