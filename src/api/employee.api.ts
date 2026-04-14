import { APIRequestContext } from '@playwright/test';
import { BaseAPI } from './base.api';
import { CreateEmployeePayload, Employee } from '../types/employee.types';
import { OrangeHRMListResponse, OrangeHRMSingleResponse } from '../types/api-response.types';

/**
 * Employee API client for OrangeHRM REST endpoints.
 */
export class EmployeeAPI extends BaseAPI {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async getAll(): Promise<Employee[]> {
    const res = await this.get<OrangeHRMListResponse<Employee>>(
      '/web/index.php/api/v2/pim/employees',
    );
    return res.data;
  }

  async getById(empNumber: number): Promise<Employee> {
    const res = await this.get<OrangeHRMSingleResponse<Employee>>(
      `/web/index.php/api/v2/pim/employees/${empNumber}`,
    );
    return res.data;
  }

  async create(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await this.post<OrangeHRMSingleResponse<Employee>>(
      '/web/index.php/api/v2/pim/employees',
      payload,
    );
    return res.data;
  }

  async update(empNumber: number, payload: Partial<Employee>): Promise<Employee> {
    const res = await this.put<OrangeHRMSingleResponse<Employee>>(
      `/web/index.php/api/v2/pim/employees/${empNumber}`,
      payload,
    );
    return res.data;
  }

  async remove(empNumber: number): Promise<void> {
    await this.delete(`/web/index.php/api/v2/pim/employees/${empNumber}`);
  }
}
