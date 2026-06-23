import { test, expect } from '@playwright/test';
import { Pact } from '@pact-foundation/pact';
import { LeaveAPI, LeaveRequest } from '../../src/api/leave.api';

const pact = new Pact({
  consumer: 'BestTester',
  provider: 'OrangeHRM-Leave',
  port: 8083,
});

test.describe('Leave API Contract', () => {
  test.beforeAll(async () => {
    await pact.setup();
  });

  test.afterAll(async () => {
    await pact.finalize();
  });

  test.afterEach(async () => {
    await pact.verify();
  });

  test('getLeaveTypes should GET /api/v2/leave/leave-types', async ({ request }) => {
    const expectedLeaveTypes = [
      { id: 1, name: 'Annual' },
      { id: 2, name: 'Casual' },
      { id: 3, name: 'Sick' },
    ];

    await pact
      .addInteraction({
        state: 'leave types exist',
        uponReceiving: 'a request for all leave types',
        withRequest: {
          method: 'GET',
          path: '/web/index.php/api/v2/leave/leave-types',
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
            data: expectedLeaveTypes,
            meta: {
              total: 3,
            },
          },
        },
      })
      .executeTest(async () => {
        const leaveAPI = new LeaveAPI(request);
        const types = await leaveAPI.getLeaveTypes();
        expect(types).toHaveLength(3);
        expect(types[0]).toHaveProperty('name', 'Annual');
      });
  });

  test('getLeaveRequests should GET /api/v2/leave/leave-requests', async ({ request }) => {
    const expectedRequests: LeaveRequest[] = [
      {
        id: 1,
        empNumber: 1,
        leaveTypeId: 1,
        fromDate: '2024-01-15',
        toDate: '2024-01-20',
        comment: 'Vacation',
      },
    ];

    await pact
      .addInteraction({
        state: 'leave requests exist',
        uponReceiving: 'a request for leave requests',
        withRequest: {
          method: 'GET',
          path: '/web/index.php/api/v2/leave/leave-requests',
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
            data: expectedRequests,
            meta: {
              total: 1,
            },
          },
        },
      })
      .executeTest(async () => {
        const leaveAPI = new LeaveAPI(request);
        const requests = await leaveAPI.getLeaveRequests(1);
        expect(requests).toHaveLength(1);
        expect(requests[0]).toHaveProperty('fromDate', '2024-01-15');
      });
  });

  test('createLeaveRequest should POST /api/v2/leave/leave-requests', async ({ request }) => {
    const newRequest: LeaveRequest = {
      empNumber: 1,
      leaveTypeId: 1,
      fromDate: '2024-02-10',
      toDate: '2024-02-15',
      comment: 'Personal leave',
    };

    const createdRequest: LeaveRequest = {
      id: 2,
      ...newRequest,
    };

    await pact
      .addInteraction({
        state: 'authenticated',
        uponReceiving: 'a request to create a leave request',
        withRequest: {
          method: 'POST',
          path: '/web/index.php/api/v2/leave/leave-requests',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: {
            leaveTypeId: newRequest.leaveTypeId,
            fromDate: newRequest.fromDate,
            toDate: newRequest.toDate,
          },
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: createdRequest,
          },
        },
      })
      .executeTest(async () => {
        const leaveAPI = new LeaveAPI(request);
        const requestResult = await leaveAPI.createLeaveRequest(newRequest);
        expect(requestResult).toHaveProperty('id', 2);
        expect(requestResult).toHaveProperty('fromDate', '2024-02-10');
      });
  });

  test('leave request should validate required fields', async ({ request }) => {
    const invalidRequest = {
      empNumber: 1,
      leaveTypeId: 1,
      // missing fromDate and toDate
    };

    await pact
      .addInteraction({
        state: 'authenticated',
        uponReceiving: 'a request with missing required fields',
        withRequest: {
          method: 'POST',
          path: '/web/index.php/api/v2/leave/leave-requests',
          body: invalidRequest,
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: {
              status: 'Bad Request',
              message: 'Missing required fields: fromDate, toDate',
            },
          },
        },
      })
      .executeTest(async () => {
        const leaveAPI = new LeaveAPI(request);
        try {
          await leaveAPI.createLeaveRequest(invalidRequest as LeaveRequest);
          throw new Error('Should have thrown');
        } catch (e) {
          expect((e as Error).message).toBeDefined();
        }
      });
  });
});
