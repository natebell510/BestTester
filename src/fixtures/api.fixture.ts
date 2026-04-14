import { test as base, APIRequestContext, request } from '@playwright/test';
import { AuthAPI } from '../api/auth.api';
import { EmployeeAPI } from '../api/employee.api';
import { LeaveAPI } from '../api/leave.api';

export type ApiFixtures = {
  apiRequest: APIRequestContext;
  authAPI: AuthAPI;
  employeeAPI: EmployeeAPI;
  leaveAPI: LeaveAPI;
};

/**
 * API fixture — provides authenticated API clients.
 */
export const test = base.extend<ApiFixtures>({
  apiRequest: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
    });
    await use(ctx);
    await ctx.dispose();
  },

  authAPI: async ({ apiRequest }, use) => {
    const api = new AuthAPI(apiRequest);
    await api.getToken();
    await use(api);
  },

  employeeAPI: async ({ apiRequest }, use) => {
    const api = new EmployeeAPI(apiRequest);
    await use(api);
  },

  leaveAPI: async ({ apiRequest }, use) => {
    const api = new LeaveAPI(apiRequest);
    await use(api);
  },
});

export { expect } from '@playwright/test';
