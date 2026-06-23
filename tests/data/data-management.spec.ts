/* eslint-disable security/detect-non-literal-fs-filename */
import { test, expect } from '@playwright/test';
import { SeedManager } from '../../src/data/seed-manager';
import { CleanupRegistry } from '../../src/data/cleanup-registry';
import { DataBuilder } from '../../src/data/data-builder';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Test Data Management System @data @regression', () => {
  let seedManager: SeedManager;
  let cleanupRegistry: CleanupRegistry;
  const tmpDir = path.resolve(__dirname, '../../.tmp/data-management');

  test.beforeEach(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    seedManager = new SeedManager({
      seedFile: path.join(tmpDir, 'seeds.json'),
      versionTrackingFile: path.join(tmpDir, 'seed-versions.json'),
    });

    cleanupRegistry = new CleanupRegistry({
      auditFile: path.join(tmpDir, 'cleanup-audit.json'),
    });
  });

  test.afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test.describe('Seed Manager', () => {
    test('should apply seed idempotently', async () => {
      let callCount = 0;

      await seedManager.applySeed('seed-1', async () => {
        callCount++;
      });

      expect(callCount).toBe(1);

      await seedManager.applySeed('seed-1', async () => {
        callCount++;
      });

      expect(callCount).toBe(1);
    });

    test('should track applied seeds', async () => {
      await seedManager.applySeed('seed-1', async () => {});
      await seedManager.applySeed('seed-2', async () => {});

      expect(seedManager.isSeedApplied('seed-1')).toBe(true);
      expect(seedManager.isSeedApplied('seed-2')).toBe(true);
      expect(seedManager.isSeedApplied('seed-3')).toBe(false);
    });

    test('should apply multiple seeds in order', async () => {
      const order: string[] = [];

      const seeds = [
        {
          id: 'seed-a',
          fn: async () => {
            order.push('a');
          },
        },
        {
          id: 'seed-b',
          fn: async () => {
            order.push('b');
          },
        },
        {
          id: 'seed-c',
          fn: async () => {
            order.push('c');
          },
        },
      ];

      await seedManager.applySeeds(seeds);

      expect(order).toEqual(['a', 'b', 'c']);
    });

    test('should get applied seeds history', async () => {
      await seedManager.applySeed('seed-1', async () => {});

      const history = seedManager.getSeedHistory();

      expect(Object.keys(history).length).toBeGreaterThan(0);
      expect(history['seed-1']).toBeDefined();
    });

    test('should export seed history', () => {
      seedManager.exportHistory();

      const versionFile = path.join(tmpDir, 'seed-versions.json');
      expect(fs.existsSync(versionFile)).toBe(true);

      const content = fs.readFileSync(versionFile, 'utf-8');
      const data = JSON.parse(content);

      expect(data.exportedAt).toBeDefined();
      expect(data.seeds).toBeDefined();
    });

    test('should reset seed tracking', async () => {
      await seedManager.applySeed('seed-1', async () => {});
      expect(seedManager.isSeedApplied('seed-1')).toBe(true);

      seedManager.resetSeed('seed-1');
      expect(seedManager.isSeedApplied('seed-1')).toBe(false);
    });

    test('should clear all seeds', async () => {
      await seedManager.applySeed('seed-1', async () => {});
      await seedManager.applySeed('seed-2', async () => {});

      seedManager.clearAll();

      expect(seedManager.isSeedApplied('seed-1')).toBe(false);
      expect(seedManager.isSeedApplied('seed-2')).toBe(false);
    });
  });

  test.describe('Cleanup Registry', () => {
    test('should register resources for cleanup', () => {
      const id1 = cleanupRegistry.register('user', 'user-123', async () => {});
      const id2 = cleanupRegistry.register('post', 'post-456', async () => {});

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    test('should execute cleanup functions', async () => {
      let cleaned = false;

      cleanupRegistry.register('user', 'user-123', async () => {
        cleaned = true;
      });

      await cleanupRegistry.cleanupAll();

      expect(cleaned).toBe(true);
    });

    test('should mark resources as cleaned', async () => {
      const id = cleanupRegistry.register('user', 'user-123', async () => {});

      await cleanupRegistry.cleanupAll();
      cleanupRegistry.markCleaned(id);

      const records = cleanupRegistry.getRecords();
      const record = records.find((r) => r.id === id);

      expect(record).toBeDefined();
      expect(record?.cleaned).toBe(true);
      expect(record?.cleanedAt).toBeDefined();
    });

    test('should get uncleaned resources', async () => {
      cleanupRegistry.register('user', 'user-1', async () => {});
      cleanupRegistry.register('user', 'user-2', async () => {});

      const uncleaned = cleanupRegistry.getUncleanedResources();

      expect(uncleaned.length).toBe(2);
    });

    test('should calculate cleanup statistics', async () => {
      cleanupRegistry.register('user', 'user-1', async () => {
        // cleanup
      });
      cleanupRegistry.register('user', 'user-2', async () => {
        // cleanup
      });

      await cleanupRegistry.cleanupAll();

      const stats = cleanupRegistry.getStats();

      expect(stats.total).toBe(2);
      expect(stats.cleaned).toBe(2);
      expect(stats.uncleaned).toBe(0);
      expect(stats.cleanupRate).toBe(100);
    });

    test('should handle cleanup errors gracefully', async () => {
      cleanupRegistry.register('user', 'user-1', async () => {
        throw new Error('Cleanup failed');
      });

      await expect(cleanupRegistry.cleanupAll()).rejects.toThrow('Cleanup failed');
    });

    test('should export cleanup audit trail', () => {
      cleanupRegistry.register('user', 'user-1', async () => {});

      const audit = cleanupRegistry.exportAudit();
      const data = JSON.parse(audit);

      expect(data.exportedAt).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.records).toBeDefined();
    });

    test('should persist cleanup records to file', async () => {
      cleanupRegistry.register('user', 'user-123', async () => {
        // cleanup
      });

      const records = cleanupRegistry.getRecords();
      expect(records.length).toBeGreaterThan(0);

      const auditFile = path.join(tmpDir, 'cleanup-audit.json');
      expect(fs.existsSync(auditFile)).toBe(true);
    });
  });

  test.describe('Data Builder - Employee', () => {
    test('should create employee with default values', () => {
      const employee = DataBuilder.employee().build();

      expect(employee.name).toBe('John Doe');
      expect(employee.email).toBe('john@example.com');
      expect(employee.role).toBe('Developer');
    });

    test('should build employee with custom values', () => {
      const employee = DataBuilder.employee()
        .withName('Jane Doe')
        .withEmail('jane@example.com')
        .withRole('Manager')
        .withDepartment('Sales')
        .withSalary(120000)
        .withSubordinates(5)
        .build();

      expect(employee.name).toBe('Jane Doe');
      expect(employee.email).toBe('jane@example.com');
      expect(employee.role).toBe('Manager');
      expect(employee.department).toBe('Sales');
      expect(employee.salary).toBe(120000);
      expect(employee.subordinates).toBe(5);
    });

    test('should build employee asynchronously', async () => {
      const employee = await DataBuilder.employee().withName('Async Employee').buildAsync();

      expect(employee.name).toBe('Async Employee');
    });

    test('should validate employee schema', () => {
      expect(() => {
        DataBuilder.employee().withName('').build();
      }).toThrow();
    });

    test('should create multiple employees with variations', () => {
      const employees = DataBuilder.employeesWithVariations(3);

      expect(employees.length).toBe(3);
      expect(employees[0]?.name).toBe('Employee 0');
      expect(employees[1]?.name).toBe('Employee 1');
      expect(employees[2]?.name).toBe('Employee 2');
    });
  });

  test.describe('Data Builder - User', () => {
    test('should create user with default values', () => {
      const user = DataBuilder.user().build();

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
    });

    test('should build user with custom values', () => {
      const user = DataBuilder.user()
        .withUsername('admin')
        .withEmail('admin@example.com')
        .withPassword('AdminPass123!')
        .withRole('admin')
        .build();

      expect(user.username).toBe('admin');
      expect(user.email).toBe('admin@example.com');
      expect(user.password).toBe('AdminPass123!');
      expect(user.role).toBe('admin');
    });

    test('should validate user schema', () => {
      expect(() => {
        DataBuilder.user().withUsername('ab').build();
      }).toThrow();
    });

    test('should create multiple users with variations', () => {
      const users = DataBuilder.usersWithVariations(3);

      expect(users.length).toBe(3);
      expect(users[0]?.username).toBe('user0');
      expect(users[1]?.username).toBe('user1');
      expect(users[2]?.username).toBe('user2');
    });
  });

  test.describe('Integration - Seed + Cleanup', () => {
    test('should seed data and cleanup after test', async () => {
      let dataCreated = false;
      let dataDeleted = false;

      await seedManager.applySeed('create-user', async () => {
        dataCreated = true;
      });

      cleanupRegistry.register('user', 'user-123', async () => {
        dataDeleted = true;
      });

      expect(dataCreated).toBe(true);
      expect(dataDeleted).toBe(false);

      await cleanupRegistry.cleanupAll();

      expect(dataDeleted).toBe(true);
    });

    test('should use builders to create and cleanup data', () => {
      const employee = DataBuilder.employee().withName('Test Employee').build();

      cleanupRegistry.register('employee', employee.name, async () => {
        // Simulate deletion
      });

      const records = cleanupRegistry.getRecords();
      expect(records.length).toBeGreaterThan(0);
      expect(records[0]?.resourceId).toBe('Test Employee');
    });
  });
});
