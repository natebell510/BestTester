import axios from 'axios';
import { logger } from './logger';

const JENKINS_URL = process.env.JENKINS_URL ?? '';
const JENKINS_USERNAME = process.env.JENKINS_USERNAME ?? '';
const JENKINS_TOKEN = process.env.JENKINS_TOKEN ?? '';

const auth = { username: JENKINS_USERNAME, password: JENKINS_TOKEN };

export async function triggerJob(
  jobName: string,
  params: Record<string, string> = {},
): Promise<number> {
  const hasParams = Object.keys(params).length > 0;
  const url = hasParams
    ? `${JENKINS_URL}/job/${jobName}/buildWithParameters`
    : `${JENKINS_URL}/job/${jobName}/build`;

  const response = await axios.post(url, null, { auth, params });
  const location = response.headers['location'] as string;
  const queueId = parseInt(location.split('/').filter(Boolean).pop() ?? '0', 10);
  logger.info(`Triggered Jenkins job ${jobName}, queue id: ${queueId}`);
  return queueId;
}

export async function getJobStatus(
  jobName: string,
  buildNumber: number,
): Promise<string> {
  const url = `${JENKINS_URL}/job/${jobName}/${buildNumber}/api/json`;
  const response = await axios.get<{ result: string; building: boolean }>(url, { auth });
  return response.data.building ? 'BUILDING' : response.data.result;
}

export async function getBuildLogs(jobName: string, buildNumber: number): Promise<string> {
  const url = `${JENKINS_URL}/job/${jobName}/${buildNumber}/consoleText`;
  const response = await axios.get<string>(url, { auth });
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
