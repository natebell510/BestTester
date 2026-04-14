import axios, { AxiosInstance } from 'axios';
import * as http from 'http';
import { logger } from './logger';

// Lazy-init so env vars are read after dotenv.config() in the calling agent
const cookieJar: string[] = [];
let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (_client) return _client;
  _client = axios.create({
    baseURL: process.env.JENKINS_URL ?? '',
    auth: {
      username: process.env.JENKINS_USERNAME ?? '',
      password: process.env.JENKINS_TOKEN ?? '',
    },
    httpAgent: new http.Agent({ keepAlive: true }),
  });
  _client.interceptors.response.use((res) => {
    const sc = res.headers['set-cookie'];
    if (sc) cookieJar.push(...sc.map((c) => c.split(';')[0]));
    return res;
  });
  _client.interceptors.request.use((config) => {
    if (cookieJar.length) config.headers['Cookie'] = cookieJar.join('; ');
    return config;
  });
  return _client;
}

async function getCrumb(): Promise<Record<string, string>> {
  try {
    const res = await getClient().get('/crumbIssuer/api/json');
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
  const url = hasParams ? `/job/${jobName}/buildWithParameters` : `/job/${jobName}/build`;

  const response = await getClient().post(url, null, { params, headers: { ...crumb } });
  const location = response.headers['location'] as string;
  const queueId = parseInt(location.split('/').filter(Boolean).pop() ?? '0', 10);
  logger.info(`Triggered Jenkins job ${jobName}, queue id: ${queueId}`);
  return queueId;
}

export async function getJobStatus(jobName: string, buildNumber: number): Promise<string> {
  const response = await getClient().get<{ result: string; building: boolean }>(
    `/job/${jobName}/${buildNumber}/api/json`,
  );
  return response.data.building ? 'BUILDING' : response.data.result;
}

export async function getBuildLogs(jobName: string, buildNumber: number): Promise<string> {
  const response = await getClient().get<string>(`/job/${jobName}/${buildNumber}/consoleText`);
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
