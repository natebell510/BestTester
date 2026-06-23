import { faker } from '@faker-js/faker';
import { CreateEmployeePayload } from '../types/employee.types';

export function generateEmployee(): CreateEmployeePayload {
  return {
    firstName: faker.person.firstName(),
    middleName: faker.person.middleName(),
    lastName: faker.person.lastName(),
  };
}

export function generateEmail(): string {
  return faker.internet.email();
}

export function generateUsername(): string {
  return faker.internet.userName();
}

export function generatePassword(): string {
  return faker.internet.password({ length: 12, memorable: false });
}
