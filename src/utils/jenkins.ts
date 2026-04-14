import axios, { AxiosInstance } from 'axios';
import * as http from 'http';
import { logger } from './logger';

const JENKINS_URL = process.env.JENKINS_URL ?? '';
const JENKINS_USERNAME = process.env.JENKINS_USERNAME ?? '';
const JENKINS_TOKEN = process.env.JENKINS_TOKEN ?? '';

const auth = { username: JENKINS_USERNAME, password: JENKINS_TOKEN };

// Shared client with cookie jar for CSRF crumb support
const cookieJar: string[] = [];
const client: AxiosInstance = axios.create({
  baseURL: JENKINS_URL,
  auth,
  httpAgent: new http.Agent({ keepAlive: true }),
});
client.interceptors.response.use(res => {
  const sc = res.headers['set-cookie'];
  if (sc) cookieJar.push(...sc.map(c => c.split(';')[0]));
  return res;
});
client.interceptors.request.use(config => {
  if (cookieJar.length) config.headers['Cookie'] = cookieJar.join('; ');
  return config;
});

async function getCrumb(): Promise<Record<string, string>> {
  try {
    const res = await client.get('/crumbIssuer/api/json');
    return { [res.data.crumbRequestField]: res.data.crumb };
  } catch {
    return {};
  }
}

export async function triggerJob(
  jobName: string,
  params: Record<string, string> = {},
): Promise<number> {
  const crumb = await getCrumb();
  const hasParams = Object.keys(params).length > 0;
  const url = hasParams
    ? `/job/${jobName}/buildWithParameters`
    : `/job/${jobName}/build`;

  const response = await client.post(url, null, { params, headers: { ...crumb } });
  const location = response.headers['location'] as string;
  const queueId = parseInt(location.split('/').filter(Boolean).pop() ?? '0', 10);
  logger.info(`Triggered Jenkins job ${jobName}, queue id: ${queueId}`);
  return queueId;
}

export async function getJobStatus(
  jobName: string,
  buildNumber: number,
): Promise<string> {
  const response = await client.get<{ result: string; building: boolean }>(`/job/${jobName}/${buildNumber}/api/json`);
  return response.data.building ? 'BUILDING' : response.data.result;
}

export async function getBuildLogs(jobName: string, buildNumber: number): Promise<string> {
  const response = await client.get<string>(`/job/${jobName}/${buildNumber}/consoleText`);
  return response.data;
}

export async function pollUntilComplete(
  jobName: string,
  buildNumber: number,
  intervalMs = 10_000,
  maxAttempts = 60,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getJobStatus(jobName, buildNumber);
    if (status !== 'BUILDING') return status;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Job ${jobName}#${buildNumber} did not complete within timeout`);
}
