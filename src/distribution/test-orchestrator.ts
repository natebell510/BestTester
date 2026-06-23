import { EventEmitter } from 'events';

export interface WorkerConfig {
  workerId: string;
  capacity: number;
  endpoint?: string;
  isAvailable: boolean;
}

export interface TestJob {
  jobId: string;
  testName: string;
  testPath: string;
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  workerId?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  result?: { passed: boolean; error?: string };
}

export interface DistributionStrategy {
  name: string;
  balanceMethod: 'round-robin' | 'least-loaded' | 'by-priority' | 'affinity';
}

export class TestOrchestrator extends EventEmitter {
  private workers: Map<string, WorkerConfig> = new Map();
  private jobs: Map<string, TestJob> = new Map();
  private jobQueue: TestJob[] = [];
  private workerLoads: Map<string, number> = new Map();
  private strategy: DistributionStrategy;
  private completedJobs: TestJob[] = [];

  constructor(strategy: DistributionStrategy = { name: 'default', balanceMethod: 'least-loaded' }) {
    super();
    this.strategy = strategy;
  }

  registerWorker(config: WorkerConfig): void {
    this.workers.set(config.workerId, config);
    this.workerLoads.set(config.workerId, 0);
    this.emit('worker-registered', config.workerId);
  }

  unregisterWorker(workerId: string): void {
    this.workers.delete(workerId);
    this.workerLoads.delete(workerId);
    this.emit('worker-unregistered', workerId);
  }

  submitJob(job: Omit<TestJob, 'jobId' | 'status'>): TestJob {
    const testJob: TestJob = {
      ...job,
      jobId: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
    };

    this.jobs.set(testJob.jobId, testJob);
    this.jobQueue.push(testJob);
    this.emit('job-submitted', testJob.jobId);

    return testJob;
  }

  assignJob(): TestJob | null {
    if (this.jobQueue.length === 0) {
      return null;
    }

    const job = this.jobQueue.shift()!;
    const workerId = this.selectWorker();

    if (!workerId) {
      this.jobQueue.unshift(job);
      return null;
    }

    job.workerId = workerId;
    job.status = 'running';
    job.startTime = new Date().toISOString();

    const currentLoad = this.workerLoads.get(workerId) || 0;
    this.workerLoads.set(workerId, currentLoad + 1);

    this.emit('job-assigned', { jobId: job.jobId, workerId });

    return job;
  }

  completeJob(jobId: string, result: { passed: boolean; error?: string }): void {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'completed';
    job.endTime = new Date().toISOString();
    job.result = result;

    if (job.startTime) {
      const start = new Date(job.startTime).getTime();
      const end = new Date(job.endTime).getTime();
      job.duration = end - start;
    }

    if (job.workerId) {
      const currentLoad = this.workerLoads.get(job.workerId) || 0;
      this.workerLoads.set(job.workerId, Math.max(0, currentLoad - 1));
    }

    this.completedJobs.push(job);
    this.emit('job-completed', jobId);
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'failed';
    job.endTime = new Date().toISOString();
    job.result = { passed: false, error };

    if (job.startTime) {
      const start = new Date(job.startTime).getTime();
      const end = new Date(job.endTime).getTime();
      job.duration = end - start;
    }

    if (job.workerId) {
      const currentLoad = this.workerLoads.get(job.workerId) || 0;
      this.workerLoads.set(job.workerId, Math.max(0, currentLoad - 1));

      // Requeue job for retry
      this.jobQueue.unshift(job);
      job.status = 'pending';
      job.workerId = undefined;
    }

    this.emit('job-failed', jobId);
  }

  private selectWorker(): string | null {
    const availableWorkers = Array.from(this.workers.values()).filter((w) => w.isAvailable);

    if (availableWorkers.length === 0) {
      return null;
    }

    switch (this.strategy.balanceMethod) {
      case 'round-robin':
        return this.selectByRoundRobin(availableWorkers);
      case 'least-loaded':
        return this.selectByLeastLoaded(availableWorkers);
      case 'by-priority':
        return this.selectByPriority(availableWorkers);
      case 'affinity':
        return this.selectByAffinity(availableWorkers);
      default:
        return availableWorkers[0].workerId;
    }
  }

  private selectByRoundRobin(workers: WorkerConfig[]): string {
    return workers[Math.floor(Math.random() * workers.length)].workerId;
  }

  private selectByLeastLoaded(workers: WorkerConfig[]): string {
    let minLoad = Infinity;
    let selectedWorker = workers[0].workerId;

    workers.forEach((worker) => {
      const load = this.workerLoads.get(worker.workerId) || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedWorker = worker.workerId;
      }
    });

    return selectedWorker;
  }

  private selectByPriority(workers: WorkerConfig[]): string {
    return workers.sort((a, b) => {
      const loadA = this.workerLoads.get(a.workerId) || 0;
      const loadB = this.workerLoads.get(b.workerId) || 0;
      return loadA - loadB;
    })[0].workerId;
  }

  private selectByAffinity(workers: WorkerConfig[]): string {
    // Simple affinity: prefer workers with lower load but consider capacity
    return workers.sort((a, b) => {
      const capacityA = a.capacity || 1;
      const capacityB = b.capacity || 1;
      const loadA = (this.workerLoads.get(a.workerId) || 0) / capacityA;
      const loadB = (this.workerLoads.get(b.workerId) || 0) / capacityB;
      return loadA - loadB;
    })[0].workerId;
  }

  getWorkerStatus(workerId: string): WorkerConfig | undefined {
    return this.workers.get(workerId);
  }

  getWorkerLoad(workerId: string): number {
    return this.workerLoads.get(workerId) || 0;
  }

  getPendingJobs(): TestJob[] {
    return this.jobQueue;
  }

  getRunningJobs(): TestJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'running');
  }

  getCompletedJobs(): TestJob[] {
    return [...this.completedJobs];
  }

  getJobStatus(jobId: string): TestJob | undefined {
    return this.jobs.get(jobId);
  }

  getDistributionStats(): {
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    runningJobs: number;
    failedJobs: number;
    successRate: number;
    workerUtilization: Record<string, number>;
  } {
    const all = Array.from(this.jobs.values());
    const completed = all.filter((j) => j.status === 'completed');
    const pending = this.jobQueue.length;
    const running = all.filter((j) => j.status === 'running');
    const failed = all.filter((j) => j.status === 'failed');

    const successRate =
      completed.length > 0
        ? (completed.filter((j) => j.result?.passed).length / completed.length) * 100
        : 0;

    const workerUtilization: Record<string, number> = {};
    this.workers.forEach((worker) => {
      const load = this.workerLoads.get(worker.workerId) || 0;
      workerUtilization[worker.workerId] = (load / worker.capacity) * 100;
    });

    return {
      totalJobs: all.length,
      completedJobs: completed.length,
      pendingJobs: pending,
      runningJobs: running.length,
      failedJobs: failed.length,
      successRate,
      workerUtilization,
    };
  }

  setWorkerAvailability(workerId: string, available: boolean): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.isAvailable = available;
      this.emit('worker-availability-changed', { workerId, available });
    }
  }

  getAverageJobDuration(): number {
    if (this.completedJobs.length === 0) return 0;
    const totalDuration = this.completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0);
    return totalDuration / this.completedJobs.length;
  }

  clear(): void {
    this.workers.clear();
    this.jobs.clear();
    this.jobQueue = [];
    this.workerLoads.clear();
    this.completedJobs = [];
  }
}
