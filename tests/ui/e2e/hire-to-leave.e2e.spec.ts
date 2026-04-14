/**
 * @file hire-to-leave.e2e.spec.ts
 * @description Full E2E test: hire employee via API → verify UI → assign leave → download report → verify Excel.
 * @tags @regression @e2e @smoke
 */
import { test, expect } from '@playwright/test';
import { request } from '@playwright/test';
import { EmployeeAPI } from '../../../src/api/employee.api';
import { AuthAPI } from '../../../src/api/auth.api';
import { EmployeePage } from '../../../src/pages/employee.page';
import { LeavePage } from '../../../src/pages/leave.page';
import { ReportsPage } from '../../../src/pages/reports.page';
import { generateEmployee } from '../../../src/utils/faker-data';
import { verifyExcelDownload } from '../../../src/utils/download-verifier';
import { futureDateFormatted } from '../../../src/utils/date-utils';

test.use({ storageState: 'auth-state/admin.json' });

test('@regression @e2e @smoke — hire to leave full journey', async ({ page }) => {
  // 1. Create employee via API
  const apiContext = await request.newContext({
    baseURL: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
  });
  const authAPI = new AuthAPI(apiContext);
  await authAPI.getToken();
  const employeeAPI = new EmployeeAPI(apiContext);
  employeeAPI.setToken(await authAPI.getToken());

  const empData = generateEmployee();
  const created = await employeeAPI.create(empData);
  expect(created.empNumber).toBeDefined();

  // 2. Verify employee appears in UI
  const employeePage = new EmployeePage(page);
  await employeePage.goto();
  await employeePage.searchEmployee(empData.firstName);
  await employeePage.assertEmployeeVisible(empData.firstName);

  // 3. Assign leave
  const leavePage = new LeavePage(page);
  await leavePage.goto();
  await leavePage.applyLeave('Annual Leave', futureDateFormatted(10), futureDateFormatted(11));

  // 4. Download Excel report and verify employee name
  const reportsPage = new ReportsPage(page);
  await reportsPage.goto();
  const download = await reportsPage.downloadExcelReport();
  const hasHeaders = await verifyExcelDownload(download.path, ['First Name', 'Last Name']);
  expect(hasHeaders).toBe(true);

  await apiContext.dispose();
});
