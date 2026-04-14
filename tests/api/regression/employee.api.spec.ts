/**
 * @file employee.api.spec.ts
 * @description CRUD regression tests for OrangeHRM Employee API with Zod schema validation.
 * @tags @regression @api
 */
import { test, expect } from '../../../src/fixtures/api.fixture';
import { generateEmployee } from '../../../src/utils/faker-data';
import { z } from 'zod';

const EmployeeSchema = z.object({
  empNumber: z.number(),
  firstName: z.string(),
  middleName: z.string(),
  lastName: z.string(),
});

test.describe('Employee API @regression @api', () => {
  let createdEmpNumber: number;

  test('POST /employees — should create a new employee', async ({ employeeAPI }) => {
    const payload = generateEmployee();
    const employee = await employeeAPI.create(payload);

    const parsed = EmployeeSchema.safeParse(employee);
    expect(parsed.success).toBe(true);
    expect(employee.firstName).toBe(payload.firstName);
    expect(employee.lastName).toBe(payload.lastName);

    createdEmpNumber = employee.empNumber!;
  });

  test('GET /employees — should return employee list', async ({ employeeAPI }) => {
    const employees = await employeeAPI.getAll();
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
  });

  test('GET /employees/:id — should return single employee', async ({ employeeAPI }) => {
    const employees = await employeeAPI.getAll();
    const first = employees[0];
    expect(first?.empNumber).toBeDefined();

    const employee = await employeeAPI.getById(first!.empNumber!);
    const parsed = EmployeeSchema.safeParse(employee);
    expect(parsed.success).toBe(true);
  });

  test('PUT /employees/:id — should update employee', async ({ employeeAPI }) => {
    const employees = await employeeAPI.getAll();
    const target = employees[0];
    expect(target?.empNumber).toBeDefined();

    const updated = await employeeAPI.update(target!.empNumber!, { lastName: 'UpdatedLast' });
    expect(updated.lastName).toBe('UpdatedLast');
  });

  test('DELETE /employees/:id — should delete employee', async ({ employeeAPI }) => {
    if (!createdEmpNumber) test.skip();
    await employeeAPI.remove(createdEmpNumber);
    const employees = await employeeAPI.getAll();
    const found = employees.find((e) => e.empNumber === createdEmpNumber);
    expect(found).toBeUndefined();
  });
});
