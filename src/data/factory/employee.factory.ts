import { faker } from '@faker-js/faker';
import { APIRequestContext } from '@playwright/test';
import { BaseFactory } from './base.factory';
import { Employee, CreateEmployeePayload } from '../../types/employee.types';
import { EmployeeAPI } from '../../api/employee.api';

export class EmployeeFactory extends BaseFactory<Employee & { id?: string }> {
  private api: EmployeeAPI;

  constructor(request: APIRequestContext, token: string) {
    super();
    this.api = new EmployeeAPI(request);
    this.api.setToken(token);
  }

  defaults(): Partial<CreateEmployeePayload> {
    return {
      firstName: faker.person.firstName(),
      middleName: '',
      lastName: faker.person.lastName(),
    };
  }

  async apiCreate(data: Partial<CreateEmployeePayload>): Promise<Employee & { id?: string }> {
    const emp = await this.api.create(data as CreateEmployeePayload);
    return { ...emp, id: String(emp.empNumber) };
  }

  async apiDelete(id: string): Promise<void> {
    await this.api.remove(Number(id));
  }
}
