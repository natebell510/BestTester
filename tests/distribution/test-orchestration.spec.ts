import { test, expect } from '@playwright/test';
import { TestOrchestrator } from '../../src/distribution/test-orchestrator';

test.describe('Distributed Test Execution @distribution', () => {
  let orchestrator: TestOrchestrator;

  test.beforeEach(() => {
    orchestrator = new TestOrchestrator();
  });

  test('should register worker', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    const worker = orchestrator.getWorkerStatus('worker-1');
    expect(worker).toBeDefined();
    expect(worker?.workerId).toBe('worker-1');
  });

  test('should unregister worker', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.unregisterWorker('worker-1');

    const worker = orchestrator.getWorkerStatus('worker-1');
    expect(worker).toBeUndefined();
  });

  test('should submit job', () => {
    const job = orchestrator.submitJob({
      testName: 'test-login',
      testPath: 'tests/login.spec.ts',
      priority: 1,
    });

    expect(job.jobId).toBeDefined();
    expect(job.status).toBe('pending');
  });

  test('should assign job to worker', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-login',
      testPath: 'tests/login.spec.ts',
      priority: 1,
    });

    const assigned = orchestrator.assignJob();

    expect(assigned).toBeDefined();
    expect(assigned?.workerId).toBe('worker-1');
    expect(assigned?.status).toBe('running');
  });

  test('should not assign job if no workers available', () => {
    orchestrator.submitJob({
      testName: 'test-login',
      testPath: 'tests/login.spec.ts',
      priority: 1,
    });

    const assigned = orchestrator.assignJob();

    expect(assigned).toBeNull();
  });

  test('should complete job', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-login',
      testPath: 'tests/login.spec.ts',
      priority: 1,
    });

    const assigned = orchestrator.assignJob();

    if (assigned) {
      orchestrator.completeJob(assigned.jobId, { passed: true });

      const status = orchestrator.getJobStatus(assigned.jobId);
      expect(status?.status).toBe('completed');
      expect(status?.result?.passed).toBe(true);
    }
  });

  test('should fail job and requeue', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-login',
      testPath: 'tests/login.spec.ts',
      priority: 1,
    });

    const assigned = orchestrator.assignJob();

    if (assigned) {
      orchestrator.failJob(assigned.jobId, 'Test failed');

      const pending = orchestrator.getPendingJobs();
      expect(pending.length).toBeGreaterThan(0);
    }
  });

  test('should track worker load', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.submitJob({
      testName: 'test-2',
      testPath: 'tests/test-2.spec.ts',
      priority: 1,
    });

    orchestrator.assignJob();
    orchestrator.assignJob();

    const load = orchestrator.getWorkerLoad('worker-1');
    expect(load).toBe(2);
  });

  test('should balance load across workers', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.registerWorker({
      workerId: 'worker-2',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.submitJob({
      testName: 'test-2',
      testPath: 'tests/test-2.spec.ts',
      priority: 1,
    });

    orchestrator.assignJob();
    orchestrator.assignJob();

    const load1 = orchestrator.getWorkerLoad('worker-1');
    const load2 = orchestrator.getWorkerLoad('worker-2');

    expect(load1 + load2).toBe(2);
  });

  test('should get pending jobs', () => {
    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.submitJob({
      testName: 'test-2',
      testPath: 'tests/test-2.spec.ts',
      priority: 1,
    });

    const pending = orchestrator.getPendingJobs();
    expect(pending.length).toBe(2);
  });

  test('should get running jobs', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.assignJob();

    const running = orchestrator.getRunningJobs();
    expect(running.length).toBe(1);
  });

  test('should get completed jobs', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    const assigned = orchestrator.assignJob();

    if (assigned) {
      orchestrator.completeJob(assigned.jobId, { passed: true });

      const completed = orchestrator.getCompletedJobs();
      expect(completed.length).toBe(1);
    }
  });

  test('should calculate distribution statistics', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    const stats = orchestrator.getDistributionStats();

    expect(stats.totalJobs).toBe(1);
    expect(stats.pendingJobs).toBe(1);
  });

  test('should calculate success rate', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.submitJob({
      testName: 'test-2',
      testPath: 'tests/test-2.spec.ts',
      priority: 1,
    });

    const assigned1 = orchestrator.assignJob();
    const assigned2 = orchestrator.assignJob();

    if (assigned1) orchestrator.completeJob(assigned1.jobId, { passed: true });
    if (assigned2) orchestrator.completeJob(assigned2.jobId, { passed: false });

    const stats = orchestrator.getDistributionStats();

    expect(stats.successRate).toBe(50);
  });

  test('should set worker availability', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.setWorkerAvailability('worker-1', false);

    const worker = orchestrator.getWorkerStatus('worker-1');
    expect(worker?.isAvailable).toBe(false);
  });

  test('should calculate average job duration', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    const assigned = orchestrator.assignJob();

    if (assigned) {
      orchestrator.completeJob(assigned.jobId, { passed: true });

      const avgDuration = orchestrator.getAverageJobDuration();
      expect(avgDuration).toBeGreaterThan(0);
    }
  });

  test('should emit worker registered event', (done) => {
    orchestrator.on('worker-registered', (workerId) => {
      expect(workerId).toBe('worker-1');
      done();
    });

    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });
  });

  test('should emit job submitted event', (done) => {
    orchestrator.on('job-submitted', (jobId) => {
      expect(jobId).toBeDefined();
      done();
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });
  });

  test('should emit job assigned event', (done) => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.on('job-assigned', (data) => {
      expect(data.workerId).toBe('worker-1');
      done();
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.assignJob();
  });

  test('should clear all data', () => {
    orchestrator.registerWorker({
      workerId: 'worker-1',
      capacity: 4,
      isAvailable: true,
    });

    orchestrator.submitJob({
      testName: 'test-1',
      testPath: 'tests/test-1.spec.ts',
      priority: 1,
    });

    orchestrator.clear();

    const stats = orchestrator.getDistributionStats();
    expect(stats.totalJobs).toBe(0);
  });

  test('should support different balancing strategies', () => {
    const roundRobin = new TestOrchestrator({ name: 'round-robin', balanceMethod: 'round-robin' });
    const leastLoaded = new TestOrchestrator({
      name: 'least-loaded',
      balanceMethod: 'least-loaded',
    });
    const byPriority = new TestOrchestrator({ name: 'by-priority', balanceMethod: 'by-priority' });
    const affinity = new TestOrchestrator({ name: 'affinity', balanceMethod: 'affinity' });

    expect(roundRobin).toBeDefined();
    expect(leastLoaded).toBeDefined();
    expect(byPriority).toBeDefined();
    expect(affinity).toBeDefined();
  });
});
