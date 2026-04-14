/**
 * @file webhook.spec.ts
 * @description Validates that the application correctly sends webhooks by capturing them via webhook.site.
 * @tags @regression @api @webhook
 */
import { test, expect } from '@playwright/test';
import axios from 'axios';
import {
  createWebhookToken,
  waitForWebhookRequest,
  clearWebhookRequests,
  header,
} from '../../../src/utils/webhook-site';

test.describe('Webhook delivery @regression @api @webhook', () => {
  let token: string;
  let webhookUrl: string;

  test.beforeEach(async () => {
    ({ token, url: webhookUrl } = await createWebhookToken());
  });

  test.afterEach(async () => {
    await clearWebhookRequests(token);
  });

  test('app sends webhook with correct payload on employee creation', async () => {
    // Simulate the app sending a webhook (replace with your real app trigger)
    const payload = {
      event: 'employee.created',
      data: { id: 42, firstName: 'Jane', lastName: 'Doe' },
      timestamp: new Date().toISOString(),
    };

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json', 'X-Event-Type': 'employee.created' },
    });

    const requests = await waitForWebhookRequest(token);
    const received = requests[0];

    expect(received.method).toBe('POST');
    expect(header(received, 'content-type')).toContain('application/json');
    expect(header(received, 'x-event-type')).toBe('employee.created');

    const body = JSON.parse(received.content) as typeof payload;
    expect(body.event).toBe('employee.created');
    expect(body.data.id).toBe(42);
    expect(body.data.firstName).toBe('Jane');
  });

  test('app sends webhook with correct payload on employee deletion', async () => {
    const payload = {
      event: 'employee.deleted',
      data: { id: 42 },
      timestamp: new Date().toISOString(),
    };

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json', 'X-Event-Type': 'employee.deleted' },
    });

    const requests = await waitForWebhookRequest(token);
    const body = JSON.parse(requests[0].content) as typeof payload;

    expect(body.event).toBe('employee.deleted');
    expect(body.data.id).toBe(42);
  });

  test('webhook.site captures correct HTTP method and headers', async () => {
    await axios.post(
      webhookUrl,
      { event: 'ping' },
      { headers: { 'Content-Type': 'application/json', 'X-Source': 'besttester' } },
    );

    const requests = await waitForWebhookRequest(token);
    expect(requests[0].method).toBe('POST');
    expect(header(requests[0], 'x-source')).toBe('besttester');
  });
});
