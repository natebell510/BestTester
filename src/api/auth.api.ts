import { APIRequestContext } from '@playwright/test';
import { BaseAPI } from './base.api';

/**
 * Auth API — authenticates via OrangeHRM's cookie-based form login.
 * After login the session cookie is stored in the APIRequestContext,
 * so subsequent requests are automatically authenticated.
 */
export class AuthAPI extends BaseAPI {
  private authenticated = false;

  constructor(request: APIRequestContext) {
    super(request);
  }

  /**
   * Performs a form-based login. OrangeHRM returns a 302 redirect on success;
   * the session cookie is captured by the APIRequestContext automatically.
   */
  async login(username: string, password: string): Promise<void> {
    const response = await this.request.post('/web/index.php/auth/validate', {
      form: { username, password },
      maxRedirects: 5,
    });
    if (!response.ok()) {
      throw new Error(`Login failed with status ${response.status()}`);
    }
    this.authenticated = true;
  }

  /**
   * Returns a truthy session marker after ensuring the context is authenticated.
   * Kept as a string return for backward-compat with callers that do `setToken(await authAPI.getToken())`.
   */
  async getToken(): Promise<string> {
    if (!this.authenticated) {
      await this.login(
        process.env.ADMIN_USERNAME ?? 'Admin',
        process.env.ADMIN_PASSWORD ?? 'admin123',
      );
    }
    return 'cookie-session';
  }
}
