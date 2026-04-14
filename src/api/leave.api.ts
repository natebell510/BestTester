import { APIRequestContext } from '@playwright/test';
import { BaseAPI } from './base.api';
import { OrangeHRMListResponse, OrangeHRMSingleResponse } from '../types/api-response.types';

export interface LeaveRequest {
  id?: number;
  empNumber: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  comment?: string;
}

/**
 * Leave API client for OrangeHRM REST endpoints.
 */
export class LeaveAPI extends BaseAPI {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async getLeaveTypes(): Promise<{ id: number; name: string }[]> {
    const res = await this.get<OrangeHRMListResponse<{ id: number; name: string }>>(
      '/web/index.php/api/v2/leave/leave-types',
    );
    return res.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLeaveRequests(empNumber: number): Promise<LeaveRequest[]> {
    const res = await this.get<OrangeHRMListResponse<LeaveRequest>>(
      '/web/index.php/api/v2/leave/leave-requests',
    );
    return res.data;
  }

  async createLeaveRequest(payload: LeaveRequest): Promise<LeaveRequest> {
    const res = await this.post<OrangeHRMSingleResponse<LeaveRequest>>(
      '/web/index.php/api/v2/leave/leave-requests',
      {
        leaveTypeId: payload.leaveTypeId,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        comment: payload.comment ?? '',
      },
    );
    return res.data;
  }
}
