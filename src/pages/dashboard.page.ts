import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { NAV } from '../constants';

export class DashboardPage extends BasePage {
  private readonly dashboardHeader  = this.page.getByRole('heading', { name: 'Dashboard' });
  private readonly userDropdown     = this.page.locator('.oxd-userdropdown-tab');
  private readonly logoutMenuItem   = this.page.getByRole('menuitem', { name: 'Logout' });
  private readonly sidebarLinks     = this.page.locator('.oxd-nav-item');
  private readonly quickLaunchItems = this.page.locator('.orangehrm-quick-launch-card');
  private readonly timeAtWork       = this.page.locator('.orangehrm-attendance-card');

  constructor(page: Page) { super(page); }

  async assertLoaded(): Promise<void> {
    await expect(this.dashboardHeader).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.logoutMenuItem.click();
    await this.page.waitForURL('**/auth/login');
  }

  async navigateTo(menuItem: string): Promise<void> {
    await this.page.getByRole('link', { name: menuItem }).click();
    await this.waitForLoad();
  }

  async assertSidebarVisible(): Promise<void> {
    await expect(this.sidebarLinks.first()).toBeVisible();
  }

  async assertQuickLaunchVisible(): Promise<void> {
    await expect(this.quickLaunchItems.first()).toBeVisible();
  }

  async getSidebarItemCount(): Promise<number> {
    return this.sidebarLinks.count();
  }

  async assertNavItemExists(name: string): Promise<void> {
    await expect(this.page.getByRole('link', { name })).toBeVisible();
  }
}
