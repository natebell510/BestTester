import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { URLS, MESSAGES } from '../constants';

export class EmployeePage extends BasePage {
  private readonly searchInput = this.page.getByPlaceholder('Type for hints...').first();
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly firstNameInput = this.page.locator('input[name="firstName"]');
  private readonly lastNameInput = this.page.locator('input[name="lastName"]');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly employeeTable = this.page.locator('.oxd-table-body');
  private readonly recordCount = this.page.locator('.oxd-text--span', { hasText: /Record/ });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete Selected' });
  private readonly confirmDelete = this.page.getByRole('button', { name: 'Yes, Delete' });

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate(URLS.EMPLOYEE_LIST);
  }

  async searchEmployee(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.searchButton.click();
    await this.waitForLoad();
  }

  async assertEmployeeVisible(name: string): Promise<void> {
    await expect(this.employeeTable.getByText(name)).toBeVisible();
  }

  async assertNoRecordsFound(): Promise<void> {
    await expect(this.page.getByText('No Records Found')).toBeVisible();
  }

  async getRecordCount(): Promise<string> {
    return this.recordCount.innerText();
  }

  async addEmployee(firstName: string, lastName: string): Promise<void> {
    await this.addButton.click();
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.saveButton.click();
    await this.waitForLoad();
  }

  async assertSaveSuccess(): Promise<void> {
    await expect(this.page.getByText(MESSAGES.SAVED)).toBeVisible();
  }
}
