import { test, expect } from '@playwright/test';
import { Pact } from '@pact-foundation/pact';
import { AuthAPI } from '../../src/api/auth.api';

const pact = new Pact({
  consumer: 'BestTester',
  provider: 'OrangeHRM-Auth',
  port: 8081,
});

test.describe('Auth API Contract', () => {
  test.beforeAll(async () => {
    await pact.setup();
  });

  test.afterAll(async () => {
    await pact.finalize();
  });

  test.afterEach(async () => {
    await pact.verify();
  });

  test('login should POST to /web/index.php/auth/validate', async ({ request }) => {
    await pact
      .addInteraction({
        state: 'unauthenticated',
        uponReceiving: 'a login request',
        withRequest: {
          method: 'POST',
          path: '/web/index.php/auth/validate',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: {
            username: 'Admin',
            password: 'admin123',
          },
        },
        willRespondWith: {
          status: 302,
          headers: {
            'Set-Cookie': expect.stringMatching(/^OHRM_.*=.*;.*$/),
            Location: expect.stringContaining('/web/index.php/dashboard/index'),
          },
        },
      })
      .executeTest(async () => {
        const authAPI = new AuthAPI(request);
        await authAPI.login('Admin', 'admin123');
      });
  });

  test('getToken should return after successful login', async ({ request }) => {
    await pact
      .addInteraction({
        state: 'authenticated',
        uponReceiving: 'a get token request',
        withRequest: {
          method: 'POST',
          path: '/web/index.php/auth/validate',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        willRespondWith: {
          status: 302,
          headers: {
            'Set-Cookie': expect.stringMatching(/^OHRM_.*=.*;.*$/),
          },
        },
      })
      .executeTest(async () => {
        const authAPI = new AuthAPI(request);
        const token = await authAPI.getToken();
        expect(token).toBe('cookie-session');
      });
  });

  test('login with invalid credentials should fail', async ({ request }) => {
    await pact
      .addInteraction({
        state: 'unauthenticated',
        uponReceiving: 'an invalid login request',
        withRequest: {
          method: 'POST',
          path: '/web/index.php/auth/validate',
          body: {
            username: 'invalid',
            password: 'wrong',
          },
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'text/html',
          },
        },
      })
      .executeTest(async () => {
        const authAPI = new AuthAPI(request);
        try {
          await authAPI.login('invalid', 'wrong');
          throw new Error('Should have thrown');
        } catch (e) {
          expect((e as Error).message).toContain('Login failed');
        }
      });
  });
});
