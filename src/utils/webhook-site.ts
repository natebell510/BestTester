import axios from 'axios';

const BASE = 'https://webhook.site';
const API = 'https://webhook.site/token';

export interface WebhookRequest {
  uuid: string;
  method: string;
  headers: Record<string, string | string[]>;
  query: Record<string, string>;
  content: string;
  created_at: string;
}

/** webhook.site returns headers as string or string[] — normalise to string. */
export function header(req: WebhookRequest, name: string): string {
  const val = req.headers[name.toLowerCase()];
  return Array.isArray(val) ? val[0] : (val ?? '');
}

/** Creates a new webhook.site token and returns the token UUID and target URL. */
export async function createWebhookToken(): Promise<{ token: string; url: string }> {
  const { data } = await axios.post<{ uuid: string }>(API, {}, {
    headers: { 'Content-Type': 'application/json' },
  });
  return { token: data.uuid, url: `${BASE}/${data.uuid}` };
}

/** Polls webhook.site until at least one request arrives or timeout is reached. */
export async function waitForWebhookRequest(
  token: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<WebhookRequest[]> {
  const { timeoutMs = 15_000, intervalMs = 1_500 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data } = await axios.get<{ data: WebhookRequest[] }>(
      `${BASE}/token/${token}/requests`,
      { params: { sorting: 'newest', per_page: 10 } },
    );
    if (data.data.length > 0) return data.data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`No webhook requests received within ${timeoutMs}ms`);
}

/** Deletes all requests for a token (best-effort cleanup). */
export async function clearWebhookRequests(token: string): Promise<void> {
  try {
    await axios.delete(`${BASE}/token/${token}/requests`);
  } catch {
    // webhook.site free tokens may not support DELETE — ignore
  }
}
