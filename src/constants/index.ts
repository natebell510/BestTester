/**
 * Central constants for BestTester — OrangeHRM URLs, selectors, roles, timeouts, etc.
 */

// ─── URLs ─────────────────────────────────────────────────────────────────────
export const URLS = {
  LOGIN:           '/web/index.php/auth/login',
  DASHBOARD:       '/web/index.php/dashboard/index',
  EMPLOYEE_LIST:   '/web/index.php/pim/viewEmployeeList',
  ADD_EMPLOYEE:    '/web/index.php/pim/addEmployee',
  LEAVE_MODULE:    '/web/index.php/leave/viewLeaveModule',
  APPLY_LEAVE:     '/web/index.php/leave/applyLeave',
  LEAVE_LIST:      '/web/index.php/leave/viewLeaveList',
  REPORTS:         '/web/index.php/report/viewReportModule',
  ADMIN:           '/web/index.php/admin/viewAdminModule',
  MY_INFO:         '/web/index.php/pim/viewMyDetails',
  RECRUITMENT:     '/web/index.php/recruitment/viewRecruitmentModule',
  PERFORMANCE:     '/web/index.php/performance/viewPerformanceModule',
  TIME:            '/web/index.php/time/viewTimeModule',
  DIRECTORY:       '/web/index.php/directory/viewDirectory',
  BUZZ:            '/web/index.php/buzz/viewBuzz',
} as const;

// ─── Credentials ──────────────────────────────────────────────────────────────
export const CREDENTIALS = {
  ADMIN: {
    username: process.env.ADMIN_USERNAME ?? 'Admin',
    password: process.env.ADMIN_PASSWORD ?? 'admin123',
  },
} as const;

// ─── Timeouts (ms) ────────────────────────────────────────────────────────────
export const TIMEOUTS = {
  SHORT:       5_000,
  DEFAULT:    10_000,
  LONG:       30_000,
  NAVIGATION: 60_000,
} as const;

// ─── Leave Types ──────────────────────────────────────────────────────────────
export const LEAVE_TYPES = {
  ANNUAL:    'Annual Leave',
  CASUAL:    'Casual Leave',
  MATERNITY: 'Maternity Leave',
  SICK:      'Sick Leave',
  PERSONAL:  'Personal Leave',
  NO_PAY:    'No Pay Leave',
} as const;

// ─── User Roles ───────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:   'Admin',
  ESS:     'ESS',
  MANAGER: 'Manager',
} as const;

// ─── Nav Menu Labels ──────────────────────────────────────────────────────────
export const NAV = {
  ADMIN:       'Admin',
  PIM:         'PIM',
  LEAVE:       'Leave',
  TIME:        'Time',
  RECRUITMENT: 'Recruitment',
  MY_INFO:     'My Info',
  PERFORMANCE: 'Performance',
  DASHBOARD:   'Dashboard',
  DIRECTORY:   'Directory',
  BUZZ:        'Buzz',
} as const;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const MESSAGES = {
  SAVED:               'Successfully Saved',
  UPDATED:             'Successfully Updated',
  DELETED:             'Successfully Deleted',
  INVALID_CREDENTIALS: 'Invalid credentials',
  REQUIRED:            'Required',
} as const;

// ─── API Paths ────────────────────────────────────────────────────────────────
export const API = {
  BASE:          '/web/index.php/api/v2',
  EMPLOYEES:     '/web/index.php/api/v2/pim/employees',
  LEAVE_TYPES:   '/web/index.php/api/v2/leave/leave-types',
  AUTH_VALIDATE: '/web/index.php/auth/validate',
} as const;

// ─── Bedrock Models ───────────────────────────────────────────────────────────
export const BEDROCK_MODELS = {
  PRIMARY:      process.env.PRIMARY_AI_MODEL ?? 'amazon.nova-pro-v1:0',
  JUDGE:        process.env.JUDGE_MODEL      ?? 'anthropic.claude-3-haiku-20240307-v1:0',
  NOVA_LITE:    'amazon.nova-lite-v1:0',
  NOVA_MICRO:   'amazon.nova-micro-v1:0',
  NOVA_PRO:     'amazon.nova-pro-v1:0',
  CLAUDE_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  TITAN_EMBED:  'amazon.titan-embed-text-v2:0',
} as const;

// ─── Report Paths ─────────────────────────────────────────────────────────────
export const REPORT_PATHS = {
  PLAYWRIGHT:  'reports/playwright-report',
  ALLURE:      'reports/allure-results',
  JUDGE_LOGS:  'reports/judge-logs',
  SCREENSHOTS: 'reports/screenshots',
} as const;
