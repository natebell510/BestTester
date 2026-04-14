import { APIRequestContext } from '@playwright/test';
import { BaseAPI } from './base.api';

interface TokenResponse {
  token_type: string;
  access_token: string;
}

/**
 * Auth API — fetches and refreshes OrangeHRM bearer tokens.
 */
export class AuthAPI extends BaseAPI {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async login(username: string, password: string): Promise<string> {
    const response = await this.post<TokenResponse>('/web/index.php/auth/login', {
      username,
      password,
    });
    this.setToken(response.access_token);
    return response.access_token;
  }

  async getToken(): Promise<string> {
    if (!this.token) {
      await this.login(
        process.env.ADMIN_USERNAME ?? 'Admin',
        process.env.ADMIN_PASSWORD ?? 'admin123',
      );
    }
    return this.token!;
  }
}
