import { Page, Locator, expect } from '@playwright/test';

/**
 * Reusable table component abstraction for OrangeHRM data tables.
 */
export class TableComponent {
  private readonly table: Locator;

  constructor(page: Page, tableSelector = '.oxd-table') {
    this.table = page.locator(tableSelector);
  }

  async getRowCount(): Promise<number> {
    return this.table.locator('.oxd-table-row').count();
  }

  async getCellText(row: number, col: number): Promise<string> {
    return this.table
      .locator('.oxd-table-row')
      .nth(row)
      .locator('.oxd-table-cell')
      .nth(col)
      .innerText();
  }

  async assertRowContains(text: string): Promise<void> {
    await expect(this.table.getByText(text)).toBeVisible();
  }

  async clickActionOnRow(rowText: string, action: 'Edit' | 'Delete'): Promise<void> {
    const row = this.table.locator('.oxd-table-row').filter({ hasText: rowText });
    await row.getByRole('button', { name: action }).click();
  }
}
