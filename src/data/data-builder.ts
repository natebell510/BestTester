import { z } from 'zod';

interface EmployeeData {
  id?: string;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  subordinates: number;
}

interface UserData {
  id?: string;
  username: string;
  email: string;
  password: string;
  role: string;
}

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  department: z.string().min(1),
  salary: z.number().min(0),
  subordinates: z.number().min(0),
});

const userSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(1),
});

/**
 * Fluent builder for creating Employee test data.
 */
export class EmployeeBuilder {
  private data: EmployeeData = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer',
    department: 'Engineering',
    salary: 100000,
    subordinates: 0,
  };

  withName(name: string): EmployeeBuilder {
    this.data.name = name;
    return this;
  }

  withEmail(email: string): EmployeeBuilder {
    this.data.email = email;
    return this;
  }

  withRole(role: string): EmployeeBuilder {
    this.data.role = role;
    return this;
  }

  withDepartment(department: string): EmployeeBuilder {
    this.data.department = department;
    return this;
  }

  withSalary(salary: number): EmployeeBuilder {
    this.data.salary = salary;
    return this;
  }

  withSubordinates(count: number): EmployeeBuilder {
    this.data.subordinates = count;
    return this;
  }

  build(): EmployeeData {
    return employeeSchema.parse(this.data);
  }

  buildAsync(): Promise<EmployeeData> {
    return Promise.resolve(this.build());
  }
}

/**
 * Fluent builder for creating User test data.
 */
export class UserBuilder {
  private data: UserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePass123!',
    role: 'user',
  };

  withUsername(username: string): UserBuilder {
    this.data.username = username;
    return this;
  }

  withEmail(email: string): UserBuilder {
    this.data.email = email;
    return this;
  }

  withPassword(password: string): UserBuilder {
    this.data.password = password;
    return this;
  }

  withRole(role: string): UserBuilder {
    this.data.role = role;
    return this;
  }

  build(): UserData {
    return userSchema.parse(this.data);
  }

  buildAsync(): Promise<UserData> {
    return Promise.resolve(this.build());
  }
}

/**
 * Main DataBuilder factory for accessing all builders.
 */
export class DataBuilder {
  static employee(): EmployeeBuilder {
    return new EmployeeBuilder();
  }

  static user(): UserBuilder {
    return new UserBuilder();
  }

  /**
   * Create multiple employees with variations.
   */
  static employeesWithVariations(count: number): EmployeeData[] {
    const employees: EmployeeData[] = [];
    const roles: string[] = ['Developer', 'Manager', 'QA'];
    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      employees.push(
        new EmployeeBuilder()
          .withName(`Employee ${i}`)
          .withEmail(`employee${i}@example.com`)
          .withRole(role ?? 'Developer')
          .build(),
      );
    }
    return employees;
  }

  /**
   * Create multiple users with variations.
   */
  static usersWithVariations(count: number): UserData[] {
    const users: UserData[] = [];
    const roles: string[] = ['user', 'admin', 'moderator'];
    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      users.push(
        new UserBuilder()
          .withUsername(`user${i}`)
          .withEmail(`user${i}@example.com`)
          .withRole(role ?? 'user')
          .build(),
      );
    }
    return users;
  }
}

export type { EmployeeData, UserData };
