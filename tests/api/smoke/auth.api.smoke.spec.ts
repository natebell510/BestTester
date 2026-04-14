/**
 * @file auth.api.smoke.spec.ts
 * @description Smoke tests for OrangeHRM Auth API endpoints.
 * @tags @smoke @api
 */
import { test, expect } from '../../../src/fixtures/api.fixture';

test.describe('Auth API @smoke @api', () => {
  test('should obtain a valid auth token', async ({ authAPI }) => {
    const token = await authAPI.getToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });
});
