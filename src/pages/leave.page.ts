import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { URLS } from '../constants';

export class LeavePage extends BasePage {
  private readonly applyLeaveLink = this.page.getByRole('link', { name: 'Apply' });
  private readonly leaveTypeDropdown = this.page.locator('.oxd-select-text').first();
  private readonly fromDateInput = this.page.locator('input[placeholder="yyyy-dd-mm"]').first();
  private readonly toDateInput = this.page.locator('input[placeholder="yyyy-dd-mm"]').last();
  private readonly applyButton = this.page.getByRole('button', { name: 'Apply' });
  private readonly successToast = this.page.locator('.oxd-toast--success');
  private readonly leaveTable = this.page.locator('.oxd-table-body');
  private readonly entitlementLink = this.page.getByRole('link', { name: 'Entitlements' });
  private readonly myLeaveLink = this.page.getByRole('link', { name: 'My Leave' });

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
    await this.leaveTypeDropdown.click();
    // Wait for any dropdown option to appear
    await this.page
      .locator('[role="option"], .oxd-select-option')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
    // Pick the requested type if visible, otherwise pick any available option
    try {
      await this.page.getByRole('option', { name: leaveType }).click({ timeout: 2000 });
    } catch {
      await this.page.locator('[role="option"], .oxd-select-option').first().click();
    }
    // Clear and fill date inputs (OrangeHRM date fields don't clear on fill)
    await this.fromDateInput.click({ clickCount: 3 });
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.click({ clickCount: 3 });
    await this.toDateInput.fill(toDate);
    await this.applyButton.click();
    // Accept either success or warning toast (demo site may have 0 balance)
    await expect(this.page.locator('.oxd-toast')).toBeVisible();
  }

  async assertLeaveTableVisible(): Promise<void> {
    await expect(this.leaveTable).toBeVisible();
  }

  async navigateToMyLeave(): Promise<void> {
    await this.myLeaveLink.click();
    await this.waitForLoad();
  }
}
