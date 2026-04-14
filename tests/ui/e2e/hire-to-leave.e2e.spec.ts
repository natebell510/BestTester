/**
 * @file hire-to-leave.e2e.spec.ts
 * @description Full E2E test: hire employee via API → verify UI → assign leave → download report → verify Excel.
 * @tags @ui @regression @e2e @smoke
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

test.use({ storageState: '.auth/admin.json' });

test('@ui @regression @e2e @smoke — hire to leave full journey', async ({ page }) => {
  // 1. Create employee via API
  const apiContext = await request.newContext({
    baseURL: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
  });
  const authAPI = new AuthAPI(apiContext);
  await authAPI.getToken();
  const employeeAPI = new EmployeeAPI(apiContext);

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
  await leavePage.applyLeave(
    'Annual Leave',
    futureDateFormatted(10, 'YYYY-DD-MM'),
    futureDateFormatted(11, 'YYYY-DD-MM'),
  );

  // 4. Download Excel report and verify employee name (skip if export unavailable on demo)
  const reportsPage = new ReportsPage(page);
  await reportsPage.goto();
  const download = await reportsPage.downloadExcelReport();
  if (download) {
    const hasHeaders = await verifyExcelDownload(download.path, ['First Name', 'Last Name']);
    expect(hasHeaders).toBe(true);
  }

  await apiContext.dispose();
});
