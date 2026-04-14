import { faker } from '@faker-js/faker';
import { APIRequestContext } from '@playwright/test';
import { BaseFactory } from './base.factory';
import { LeaveAPI, LeaveRequest } from '../../api/leave.api';

type LeaveEntity = LeaveRequest & { id: string };

export class LeaveFactory extends BaseFactory<LeaveEntity> {
  private api: LeaveAPI;

  constructor(request: APIRequestContext, token: string, private empNumber: number) {
    super();
    this.api = new LeaveAPI(request);
    this.api.setToken(token);
  }

  defaults(): Partial<LeaveEntity> {
    const from = faker.date.soon({ days: 5 });
    const to = faker.date.soon({ days: 3, refDate: from });
    return {
      empNumber: this.empNumber,
      leaveTypeId: 1,
      fromDate: from.toISOString().split('T')[0],
      toDate: to.toISOString().split('T')[0],
    };
  }

  async apiCreate(data: Partial<LeaveEntity>): Promise<LeaveEntity> {
    const result = await this.api.createLeaveRequest(data as LeaveRequest);
    return { ...result, id: String(result.id) };
  }

  async apiDelete(_id: string): Promise<void> {
    // OrangeHRM demo does not expose a delete leave endpoint; no-op for demo env
  }
}
