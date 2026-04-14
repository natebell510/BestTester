/**
 * @file leave.api.spec.ts
 * @description Regression tests for OrangeHRM Leave API.
 * @tags @regression @api
 */
import { test, expect } from '../../../src/fixtures/api.fixture';
import { z } from 'zod';
import { futureDateFormatted } from '../../../src/utils/date-utils';

const LeaveTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
});

test.describe('Leave API @regression @api', () => {
  test('GET /leave-types — should return leave types list', async ({ leaveAPI }) => {
    const types = await leaveAPI.getLeaveTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    const parsed = LeaveTypeSchema.safeParse(types[0]);
    expect(parsed.success).toBe(true);
  });

  test('GET /leave-requests — should return leave requests for employee', async ({ leaveAPI, employeeAPI }) => {
    const employees = await employeeAPI.getAll();
    const emp = employees[0];
    expect(emp?.empNumber).toBeDefined();

    const requests = await leaveAPI.getLeaveRequests(emp!.empNumber!);
    expect(Array.isArray(requests)).toBe(true);
  });

  test('POST /leave-requests — should create a leave request', async ({ leaveAPI, employeeAPI }) => {
    const employees = await employeeAPI.getAll();
    const emp = employees[0];
    const types = await leaveAPI.getLeaveTypes();
    const leaveType = types[0];

    expect(emp?.empNumber).toBeDefined();
    expect(leaveType?.id).toBeDefined();

    const request = await leaveAPI.createLeaveRequest({
      empNumber: emp!.empNumber!,
      leaveTypeId: leaveType!.id,
      fromDate: futureDateFormatted(15),
      toDate: futureDateFormatted(16),
    });
    expect(request).toBeDefined();
  });
});
