export interface Employee {
  empNumber?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  employeeId?: string;
  jobTitle?: string;
  department?: string;
  email?: string;
}

export interface CreateEmployeePayload {
  firstName: string;
  middleName: string;
  lastName: string;
}
