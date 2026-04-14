import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForDownload, DownloadResult } from '../utils/download-verifier';

/**
 * ReportsPage — OrangeHRM Reports module interactions.
 */
export class ReportsPage extends BasePage {
  private readonly reportsMenu = this.page.getByRole('link', { name: 'Reports' });
  private readonly generateButton = this.page.getByRole('button', { name: 'Generate' });
  private readonly exportButton = this.page.getByRole('button', { name: 'Export to Excel' });

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/pim/viewDefinedPredefinedReports');
  }

  async generateReport(reportName: string): Promise<void> {
    await this.page.getByText(reportName).click();
    await this.generateButton.click();
    await this.waitForLoad();
  }

  async downloadExcelReport(): Promise<DownloadResult | null> {
    // If export button is not visible (no report generated), return null
    if (!(await this.exportButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return null;
    }
    return waitForDownload(this.page, async () => {
      await this.exportButton.click();
    });
  }
}
