import { APIRequestContext } from '@playwright/test';
import { EmployeeFactory } from '../factory/employee.factory';

/**
 * Minimal data set pre-populated in globalSetup for smoke tests.
 */
export async function smokeSeed(request: APIRequestContext, token: string): Promise<void> {
  const factory = new EmployeeFactory(request, token);
  await factory.create({ firstName: 'Smoke', middleName: '', lastName: 'User' });
}
