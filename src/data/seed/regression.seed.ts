import { APIRequestContext } from '@playwright/test';
import { EmployeeFactory } from './factory/employee.factory';
import { LeaveFactory } from './factory/leave.factory';

/**
 * Full data set for regression tests.
 */
export async function regressionSeed(request: APIRequestContext, token: string): Promise<void> {
  const empFactory = new EmployeeFactory(request, token);
  const emp = await empFactory.create({ firstName: 'Regression', middleName: '', lastName: 'User' });
  const leaveFactory = new LeaveFactory(request, token, emp.empNumber!);
  await leaveFactory.create();
}
