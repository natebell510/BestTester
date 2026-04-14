export type Role = 'Admin' | 'Manager' | 'Employee';

export interface RoleConfig {
  username: string;
  password: string;
  permissions: string[];
}

export const rolesConfig: Record<Role, RoleConfig> = {
  Admin: {
    username: process.env.ADMIN_USERNAME ?? 'Admin',
    password: process.env.ADMIN_PASSWORD ?? 'admin123',
    permissions: ['manage-employees', 'manage-leave', 'view-reports', 'manage-users'],
  },
  Manager: {
    username: process.env.MANAGER_USERNAME ?? 'Manager',
    password: process.env.MANAGER_PASSWORD ?? 'manager123',
    permissions: ['view-employees', 'approve-leave', 'view-reports'],
  },
  Employee: {
    username: process.env.EMPLOYEE_USERNAME ?? 'Employee',
    password: process.env.EMPLOYEE_PASSWORD ?? 'employee123',
    permissions: ['view-own-profile', 'request-leave'],
  },
};
