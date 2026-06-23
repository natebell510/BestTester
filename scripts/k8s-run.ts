/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

interface K8sRunOptions {
  namespace: string;
  testSuite: string;
  workers: number;
  chartPath: string;
  valuesOverrides?: Record<string, string | number | boolean>;
}

interface JobResult {
  succeeded: number;
  failed: number;
  podStates: Record<string, string>;
}

class K8sTestRunner {
  private namespace: string;
  private testSuite: string;
  private workers: number;
  private chartPath: string;
  private valuesOverrides: Record<string, string | number | boolean>;
  private releaseName: string;

  constructor(options: K8sRunOptions) {
    this.namespace = options.namespace;
    this.testSuite = options.testSuite;
    this.workers = options.workers;
    this.chartPath = options.chartPath;
    this.valuesOverrides = options.valuesOverrides || {};
    this.releaseName = `besttester-${this.testSuite}-${Date.now()}`;
  }

  async deploy(): Promise<void> {
    console.log(`🚀 Deploying Helm chart for test suite: ${this.testSuite}`);
    console.log(`   Release: ${this.releaseName}`);
    console.log(`   Workers: ${this.workers}`);

    const helmCmd = this.buildHelmCommand();
    try {
      execSync(helmCmd, { stdio: 'inherit' });
      console.log('✅ Helm chart deployed successfully');
    } catch (error) {
      throw new Error(`Failed to deploy Helm chart: ${error}`);
    }
  }

  async waitForCompletion(timeoutMs: number = 3600000): Promise<JobResult> {
    console.log(`⏳ Waiting for test job to complete (timeout: ${timeoutMs / 1000}s)...`);

    const jobName = `besttester-${this.testSuite}`;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const result = this.checkJobStatus(jobName);
        if (result.status === 'completed') {
          console.log('✅ Job completed');
          return result.jobResult;
        }
        if (result.status === 'failed') {
          throw new Error(`Job failed: ${result.message}`);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('NotFound')) {
          console.log('⏳ Job still initializing...');
        } else {
          throw err;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Job timeout after ${timeoutMs / 1000}s`);
  }

  private checkJobStatus(jobName: string): {
    status: string;
    message?: string;
    jobResult?: JobResult;
  } {
    const output = execSync(
      `kubectl get job ${jobName} -n ${this.namespace} -o jsonpath='{.status}'`,
      { encoding: 'utf-8' },
    );

    const status = JSON.parse(output);

    if (status.succeeded === this.workers) {
      const podResult = this.getPodResults();
      return { status: 'completed', jobResult: podResult };
    }

    if (status.failed && status.failed > 0) {
      return { status: 'failed', message: `${status.failed} pods failed` };
    }

    return { status: 'running' };
  }

  private getPodResults(): JobResult {
    const output = execSync(
      `kubectl get pods -n ${this.namespace} -l app=besttester,test-suite=${this.testSuite} -o json`,
      { encoding: 'utf-8' },
    );

    const podData = JSON.parse(output);
    const podStates: Record<string, string> = {};
    let succeeded = 0;
    let failed = 0;

    for (const pod of podData.items) {
      const phase = pod.status.phase;
      podStates[pod.metadata.name] = phase;

      if (phase === 'Succeeded') succeeded++;
      if (phase === 'Failed') failed++;
    }

    return { succeeded, failed, podStates };
  }

  async streamLogs(): Promise<void> {
    console.log('📋 Streaming pod logs...\n');

    const podSelector = `app=besttester,test-suite=${this.testSuite}`;
    const logCmd = spawn('kubectl', [
      'logs',
      '-n',
      this.namespace,
      '-l',
      podSelector,
      '--all-containers=true',
      '--timestamps=true',
      '--prefix=true',
      '--tail=100',
    ]);

    logCmd.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    logCmd.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    return new Promise((resolve, reject) => {
      logCmd.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Log streaming failed with code ${code}`));
      });
    });
  }

  async aggregateResults(): Promise<void> {
    console.log('📊 Aggregating test results...');

    const reportDir = 'reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const podSelector = `app=besttester,test-suite=${this.testSuite}`;
    const podOutput = execSync(
      `kubectl get pods -n ${this.namespace} -l ${podSelector} -o jsonpath='{.items[*].metadata.name}'`,
      { encoding: 'utf-8' },
    );

    const podNames = podOutput.split(' ').filter(Boolean);
    console.log(`Found ${podNames.length} completed pods`);

    const aggregatedResults = {
      timestamp: new Date().toISOString(),
      testSuite: this.testSuite,
      workers: this.workers,
      pods: [] as Record<string, unknown>[],
    };

    for (const podName of podNames) {
      console.log(`  Copying results from ${podName}...`);
      try {
        execSync(
          `kubectl cp ${this.namespace}/${podName}:/app/reports . -c tester 2>/dev/null || true`,
          { stdio: 'ignore' },
        );

        const resultFile = path.join(reportDir, `${podName}-results.json`);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(resultFile)) {
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          const content = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
          aggregatedResults.pods.push({
            podName,
            ...content,
          });
        }
      } catch {
        console.log(`  ⚠️  Could not retrieve results from ${podName}`);
      }
    }

    const outputFile = path.join(reportDir, `aggregated-results-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(aggregatedResults, null, 2));
    console.log(`✅ Results aggregated to ${outputFile}`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up Helm release: ${this.releaseName}`);
    try {
      execSync(`helm uninstall ${this.releaseName} -n ${this.namespace}`, {
        stdio: 'ignore',
      });
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }

  private buildHelmCommand(): string {
    let cmd = `helm install ${this.releaseName} ${this.chartPath}`;
    cmd += ` -n ${this.namespace} --create-namespace`;
    cmd += ` --set testSuite=${this.testSuite}`;
    cmd += ` --set workers=${this.workers}`;

    for (const [key, value] of Object.entries(this.valuesOverrides)) {
      cmd += ` --set ${key}=${value}`;
    }

    return cmd;
  }
}

async function main(): Promise<void> {
  const testSuite = process.argv[2] || 'smoke';
  const workers = parseInt(process.argv[3] || '4', 10);
  const namespace = process.argv[4] || 'besttester';

  const runner = new K8sTestRunner({
    namespace,
    testSuite,
    workers,
    chartPath: path.join(__dirname, '../k8s/helm'),
    valuesOverrides: {
      'image.tag': 'latest',
      logLevel: 'info',
    },
  });

  try {
    await runner.deploy();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await runner.streamLogs();
    const result = await runner.waitForCompletion();
    console.log('\n📊 Final Results:', result);
    await runner.aggregateResults();
    await runner.cleanup();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);

    runner.cleanup().catch(() => {});
    process.exit(1);
  }
}

void main();
