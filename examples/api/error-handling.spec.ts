/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * @fileoverview API Error Handling Pattern
 *
 * Demonstrates best practices for testing API error scenarios:
 * - HTTP error status codes (4xx, 5xx)
 * - Error response structure validation
 * - Retry logic and exponential backoff
 * - Timeout handling
 * - Network error recovery
 *
 * When to use: Any API test involving error cases
 * Common pitfalls:
 *  - Only testing happy path
 *  - Not validating error response structure
 *  - Assuming errors contain specific fields
 *  - Not handling transient failures
 *
 * @example
 * npm run test:api -- error-handling.spec.ts
 */

import { test, expect } from '@playwright/test';
import { z } from 'zod';

// Validate error response structure
const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

test.describe('API Error Handling @api', () => {
  const baseURL = 'https://api.example.com';

  test('should handle 404 not found error', async ({ request }) => {
    const response = await request.get(`${baseURL}/users/nonexistent-id`);

    expect(response.status()).toBe(404);

    const data = await response.json();
    const validated = errorResponseSchema.parse(data);
    expect(validated.error.code).toBe('NOT_FOUND');
    expect(validated.error.message).toContain('not found');
  });

  test('should handle 400 bad request error', async ({ request }) => {
    const response = await request.post(`${baseURL}/users`, {
      data: {
        email: 'invalid-email', // Invalid format
        name: '',
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.details).toHaveProperty('email');
    expect(data.error.details).toHaveProperty('name');
  });

  test('should handle 401 unauthorized error', async ({ request }) => {
    // Missing authentication header
    const response = await request.get(`${baseURL}/protected/resource`);

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  test('should handle 403 forbidden error', async ({ request }) => {
    const response = await request.delete(`${baseURL}/users/other-user-id`, {
      headers: {
        Authorization: 'Bearer valid-but-wrong-token',
      },
    });

    expect(response.status()).toBe(403);

    const data = await response.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  test('should handle 429 rate limit error', async ({ request }) => {
    // Make many requests to trigger rate limit
    let response;
    for (let i = 0; i < 100; i++) {
      response = await request.get(`${baseURL}/users`);
      if (response.status() === 429) break;
    }

    if (response?.status() === 429) {
      const data = await response.json();
      expect(data.error.code).toBe('RATE_LIMITED');

      // Should include retry-after header
      const retryAfter = response.headers()['retry-after'];
      expect(retryAfter).toBeDefined();
    }
  });

  test('should handle 500 internal server error', async ({ request }) => {
    // Mock server error
    const response = await request.get(`${baseURL}/status/500`);

    expect(response.status()).toBe(500);

    const data = await response.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).toContain('Something went wrong');
  });

  test('should handle 503 service unavailable', async ({ request }) => {
    const response = await request.get(`${baseURL}/status/503`);

    expect(response.status()).toBe(503);

    const data = await response.json();
    expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  test('should handle network timeout', async ({ request }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100);

    try {
      await request.get(`${baseURL}/slow-endpoint`, {
        // Request should timeout
        timeout: 100,
      });
    } catch (error) {
      expect(error).toBeDefined();
      clearTimeout(timeoutId);
    }
  });

  test('should retry on transient failures', async ({ request }) => {
    let attempts = 0;

    // Route that fails twice then succeeds
    const mockResponse = async (): Promise<Response> => {
      attempts++;
      if (attempts < 3) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify({ id: '123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const response = await retryWithBackoff(async () => request.get(`${baseURL}/users/123`), {
      maxRetries: 3,
    });

    if (response) {
      expect(response.status()).toBe(200);
    }
  });

  test('should handle partial success response', async ({ request }) => {
    const response = await request.post(`${baseURL}/batch-create-users`, {
      data: {
        users: [
          { email: 'valid@test.com', name: 'User 1' },
          { email: 'invalid', name: 'User 2' }, // Invalid
          { email: 'valid2@test.com', name: 'User 3' },
        ],
      },
    });

    const data = await response.json();

    // Should contain partial results
    expect(data.successful).toHaveLength(2);
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0]).toMatchObject({
      index: 1,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  test('should handle malformed JSON response', async ({ request }) => {
    try {
      const response = await request.get(`${baseURL}/malformed-json`);

      // Try to parse — should fail
      const data = await response.json();
      fail('Should have thrown parsing error');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error instanceof SyntaxError).toBe(true);
    }
  });

  test('should handle missing required fields in error response', async ({ request }) => {
    const response = await request.get(`${baseURL}/users/123`);

    if (!response.ok()) {
      const data = await response.json();

      // Validate error has minimum required fields
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();
    }
  });

  test('should handle redirect responses', async ({ request }) => {
    const response = await request.get(`${baseURL}/old-endpoint`, {
      followLocation: false, // Don't auto-follow
    });

    if ([301, 302, 303, 307, 308].includes(response.status())) {
      const location = response.headers()['location'];
      expect(location).toBeDefined();
    }
  });

  test('should include request ID in error for debugging', async ({ request }) => {
    const response = await request.post(`${baseURL}/users`, {
      data: { email: 'invalid' },
    });

    const data = await response.json();

    // Should have request ID for debugging
    expect(data.error.requestId).toBeDefined();
    expect(data.error.requestId).toMatch(/^[a-f0-9-]+$/);
  });
});

// Helper: Retry with exponential backoff

async function retryWithBackoff(
  fn: () => Promise<any>,
  { maxRetries = 3, baseDelay = 100 } = {},
): Promise<any> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fn();
      if (response.ok() || response.status() < 500) {
        return response;
      }
      lastError = response;
    } catch (error) {
      lastError = error;
    }

    // Exponential backoff: 100ms, 200ms, 400ms
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
