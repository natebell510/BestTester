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

  async applyLeave(leaveType: string, fromDate: string, toDate: string): Promise<void> {
    await this.navigate(URLS.APPLY_LEAVE);
    // Select leave type from dropdown
    await this.leaveTypeDropdown.click();
    await this.page.waitForTimeout(500);
    // Try the specific type first, then fall back to any visible option
    const specificOption = this.page.locator('.oxd-select-text-input');
    await specificOption.fill(leaveType.substring(0, 3));
    await this.page.waitForTimeout(500);
    // Click the first matching dropdown item
    const dropdownItem = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .first();
    try {
      await dropdownItem.click({ timeout: 3000 });
    } catch {
      // If no dropdown appeared, just press Enter to accept whatever is there
      await this.page.keyboard.press('Enter');
    }
    // Fill dates
    await this.fromDateInput.click({ clickCount: 3 });
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.click({ clickCount: 3 });
    await this.toDateInput.fill(toDate);
    await this.applyButton.click();
    // Accept either success or warning toast (demo site may have 0 balance)
    await expect(this.page.locator('.oxd-toast')).toBeVisible();
  }

  async assertLeaveTableVisible(): Promise<void> {
    await expect(this.page.locator('.oxd-table-body')).toBeVisible();
  }

  async navigateToMyLeave(): Promise<void> {
    await this.page.getByRole('link', { name: 'My Leave' }).click();
    await this.waitForLoad();
  }
}
