import { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../utils/logger';

/**
 * Base API client with full request/response logging and error handling.
 */
export class BaseAPI {
  protected token: string | null = null;

  constructor(protected readonly request: APIRequestContext) {}

  protected async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const response = await this.request.get(url, {
      headers: this.authHeaders(),
      params,
    });
    return this.handle<T>(response, 'GET', url);
  }

  protected async post<T>(url: string, data: unknown): Promise<T> {
    const response = await this.request.post(url, {
      headers: this.authHeaders(),
      data,
    });
    return this.handle<T>(response, 'POST', url);
  }

  protected async put<T>(url: string, data: unknown): Promise<T> {
    const response = await this.request.put(url, {
      headers: this.authHeaders(),
      data,
    });
    return this.handle<T>(response, 'PUT', url);
  }

  protected async patch<T>(url: string, data: unknown): Promise<T> {
    const response = await this.request.patch(url, {
      headers: this.authHeaders(),
      data,
    });
    return this.handle<T>(response, 'PATCH', url);
  }

  protected async delete<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.request.delete(url, {
      headers: this.authHeaders(),
      ...(data ? { data } : {}),
    });
    return this.handle<T>(response, 'DELETE', url);
  }

  private authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async handle<T>(response: APIResponse, method: string, url: string): Promise<T> {
    let body: T;
    try {
      body = (await response.json()) as T;
    } catch {
      const text = await response.text();
      logger.info({ method, url, status: response.status(), body: text });
      if (!response.ok()) {
        throw new Error(`${method} ${url} failed with status ${response.status()}: ${text}`);
      }
      return {} as T;
    }
    logger.info({ method, url, status: response.status(), body });
    if (!response.ok()) {
      throw new Error(
        `${method} ${url} failed with status ${response.status()}: ${JSON.stringify(body)}`,
      );
    }
    return body;
  }

  setToken(token: string): void {
    this.token = token;
  }
}
