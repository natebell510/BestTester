import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { EmployeePage } from '../pages/employee.page';
import { LeavePage } from '../pages/leave.page';
import { ReportsPage } from '../pages/reports.page';

export type PageFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  employeePage: EmployeePage;
  leavePage: LeavePage;
  reportsPage: ReportsPage;
};

/**
 * Base fixture providing all page objects.
 */
export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  employeePage: async ({ page }, use) => use(new EmployeePage(page)),
  leavePage: async ({ page }, use) => use(new LeavePage(page)),
  reportsPage: async ({ page }, use) => use(new ReportsPage(page)),
});

export { expect } from '@playwright/test';
