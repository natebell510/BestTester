#!/usr/bin/env ts-node
/**
 * Jenkins Trigger Agent — triggers Jenkins jobs and polls for completion.
 * CLI: npm run agent:jenkins -- --job my-job --params key=value
 */
import * as dotenv from 'dotenv';
import { triggerJob, pollUntilComplete, getBuildLogs } from '../src/utils/jenkins';
import { postMessage } from '../src/utils/slack';

dotenv.config();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jobIndex = args.indexOf('--job');
  const buildIndex = args.indexOf('--build');
  const logsFlag = args.includes('--logs');

  if (jobIndex === -1 || !args[jobIndex + 1]) {
    console.error('Usage: npm run agent:jenkins -- --job <jobName> [--params k=v] [--build <num>] [--logs]');
    process.exit(1);
  }

  const jobName = args[jobIndex + 1];
  const params: Record<string, string> = {};

  const paramsIndex = args.indexOf('--params');
  if (paramsIndex !== -1 && args[paramsIndex + 1]) {
    for (const pair of args[paramsIndex + 1].split(',')) {
      const [k, v] = pair.split('=');
      if (k && v) params[k] = v;
    }
  }

  if (buildIndex !== -1 && args[buildIndex + 1]) {
    const buildNumber = parseInt(args[buildIndex + 1], 10);
    if (logsFlag) {
      const logs = await getBuildLogs(jobName, buildNumber);
      console.log(logs);
    } else {
      const status = await pollUntilComplete(jobName, buildNumber);
      console.log(`Job ${jobName}#${buildNumber} status: ${status}`);
      await postMessage(`Jenkins job *${jobName}#${buildNumber}* completed with status: *${status}*`);
    }
    return;
  }

  console.log(`Triggering Jenkins job: ${jobName}`);
  const queueId = await triggerJob(jobName, params);
  console.log(`Queued with id: ${queueId}`);
  await postMessage(`Jenkins job *${jobName}* triggered. Queue id: ${queueId}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
