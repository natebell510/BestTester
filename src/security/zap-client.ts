import axios from 'axios';

const ZAP_URL = process.env.ZAP_URL ?? 'http://localhost:8080';
const ZAP_API_KEY = process.env.ZAP_API_KEY ?? '';

/**
 * OWASP ZAP REST API client for passive/active scanning via proxy mode.
 * Set ENABLE_ZAP_PROXY=true to route Playwright traffic through ZAP.
 */
export class ZapClient {
  static proxyConfig() {
    return process.env.ENABLE_ZAP_PROXY === 'true'
      ? { server: { host: 'localhost', port: 8080 } }
      : undefined;
  }

  static async startSpider(targetUrl: string): Promise<string> {
    const res = await axios.get(`${ZAP_URL}/JSON/spider/action/scan/`, {
      params: { apikey: ZAP_API_KEY, url: targetUrl },
    });
    return res.data.scan;
  }

  static async getAlerts(targetUrl: string): Promise<{ risk: string; name: string; url: string }[]> {
    const res = await axios.get(`${ZAP_URL}/JSON/alert/view/alerts/`, {
      params: { apikey: ZAP_API_KEY, baseurl: targetUrl },
    });
    return res.data.alerts ?? [];
  }

  static async getPassiveScanProgress(): Promise<number> {
    const res = await axios.get(`${ZAP_URL}/JSON/pscan/view/recordsToScan/`, {
      params: { apikey: ZAP_API_KEY },
    });
    return parseInt(res.data.recordsToScan);
  }
}
