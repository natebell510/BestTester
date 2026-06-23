import { test, expect } from '@playwright/test';
import { Pact } from '@pact-foundation/pact';
import { EmployeeAPI } from '../../src/api/employee.api';

const pact = new Pact({
  consumer: 'BestTester',
  provider: 'OrangeHRM-Employee',
  port: 8082,
});

test.describe('Employee API Contract', () => {
  test.beforeAll(async () => {
    await pact.setup();
  });

  test.afterAll(async () => {
    await pact.finalize();
  });

  test.afterEach(async () => {
    await pact.verify();
  });

  test('getAll should GET /api/v2/pim/employees', async ({ request }) => {
    const expectedEmployees = [
      {
        empNumber: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        employeeId: 'EMP001',
        status: 'ACTIVE',
      },
    ];

    await pact
      .addInteraction({
        state: 'employees exist',
        uponReceiving: 'a request for all employees',
        withRequest: {
          method: 'GET',
          path: '/web/index.php/api/v2/pim/employees',
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: expectedEmployees,
            meta: {
              total: 1,
            },
          },
        },
      })
      .executeTest(async () => {
        const empAPI = new EmployeeAPI(request);
        const employees = await empAPI.getAll();
        expect(employees).toHaveLength(1);
        expect(employees[0]).toHaveProperty('empNumber', 1);
        expect(employees[0]).toHaveProperty('firstName', 'John');
      });
  });

  test('getById should GET /api/v2/pim/employees/{id}', async ({ request }) => {
    const expectedEmployee = {
      empNumber: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employeeId: 'EMP001',
      status: 'ACTIVE',
    };

    await pact
      .addInteraction({
        state: 'employee with ID 1 exists',
        uponReceiving: 'a request for employee 1',
        withRequest: {
          method: 'GET',
          path: '/web/index.php/api/v2/pim/employees/1',
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: expectedEmployee,
          },
        },
      })
      .executeTest(async () => {
        const empAPI = new EmployeeAPI(request);
        const employee = await empAPI.getById(1);
        expect(employee).toEqual(expectedEmployee);
      });
  });

  test('create should POST /api/v2/pim/employees', async ({ request }) => {
    const newEmployee = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      employeeId: 'EMP002',
    };

    const createdEmployee = {
      empNumber: 2,
      ...newEmployee,
      status: 'ACTIVE',
    };

    await pact
      .addInteraction({
        state: 'authenticated',
        uponReceiving: 'a request to create an employee',
        withRequest: {
          method: 'POST',
          path: '/web/index.php/api/v2/pim/employees',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: newEmployee,
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: createdEmployee,
          },
        },
      })
      .executeTest(async () => {
        const empAPI = new EmployeeAPI(request);
        const employee = await empAPI.create(newEmployee);
        expect(employee).toHaveProperty('empNumber', 2);
        expect(employee).toHaveProperty('firstName', 'Jane');
      });
  });

  test('update should PUT /api/v2/pim/employees/{id}/personal-details', async ({ request }) => {
    const updatePayload = {
      firstName: 'John',
      lastName: 'Updated',
    };

    const updatedEmployee = {
      empNumber: 1,
      ...updatePayload,
      email: 'john@example.com',
      employeeId: 'EMP001',
      status: 'ACTIVE',
    };

    await pact
      .addInteraction({
        state: 'employee with ID 1 exists',
        uponReceiving: 'a request to update employee 1',
        withRequest: {
          method: 'PUT',
          path: '/web/index.php/api/v2/pim/employees/1/personal-details',
          headers: {
            'Content-Type': 'application/json',
          },
          body: updatePayload,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: updatedEmployee,
          },
        },
      })
      .executeTest(async () => {
        const empAPI = new EmployeeAPI(request);
        const employee = await empAPI.update(1, updatePayload);
        expect(employee).toHaveProperty('lastName', 'Updated');
      });
  });

  test('remove should DELETE /api/v2/pim/employees', async ({ request }) => {
    await pact
      .addInteraction({
        state: 'employee with ID 1 exists',
        uponReceiving: 'a request to delete employee 1',
        withRequest: {
          method: 'DELETE',
          path: '/web/index.php/api/v2/pim/employees',
          body: {
            ids: [1],
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
          },
        },
      })
      .executeTest(async () => {
        const empAPI = new EmployeeAPI(request);
        await empAPI.remove(1);
      });
  });
});
