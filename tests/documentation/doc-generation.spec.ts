import { test, expect } from '@playwright/test';
import { TestDocGenerator } from '../../src/documentation/test-doc-generator';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Test Documentation Generation @documentation', () => {
  let generator: TestDocGenerator;
  const docDir = path.resolve(__dirname, '../../.tmp/docs');

  test.beforeEach(() => {
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    generator = new TestDocGenerator({
      format: 'markdown',
      includeMetadata: true,
      includeCoverage: false,
      outputDir: docDir,
    });
  });

  test.afterEach(() => {
    if (fs.existsSync(docDir)) {
      fs.rmSync(docDir, { recursive: true, force: true });
    }
  });

  test('should add test documentation', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test user login functionality',
      purpose: 'Verify login works with valid credentials',
      steps: ['Navigate to login', 'Enter username', 'Enter password', 'Click login'],
      expectedResult: 'User is logged in',
      tags: ['auth', 'critical'],
    });

    expect(generator.getTestCount()).toBe(1);
  });

  test('should add multiple tests', () => {
    generator.addTests([
      {
        testName: 'Login Test',
        description: 'Test login',
        purpose: 'Verify login',
        steps: ['Login'],
        expectedResult: 'Success',
        tags: ['auth'],
      },
      {
        testName: 'Logout Test',
        description: 'Test logout',
        purpose: 'Verify logout',
        steps: ['Logout'],
        expectedResult: 'Success',
        tags: ['auth'],
      },
    ]);

    expect(generator.getTestCount()).toBe(2);
  });

  test('should generate markdown documentation', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth'],
    });

    const filepath = generator.generateDocumentation('test-doc.md');

    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('# Test Documentation');
    expect(content).toContain('Login Test');
  });

  test('should generate HTML documentation', () => {
    const htmlGenerator = new TestDocGenerator({
      format: 'html',
      includeMetadata: true,
      includeCoverage: false,
      outputDir: docDir,
    });

    htmlGenerator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth'],
    });

    const filepath = htmlGenerator.generateDocumentation('test-doc.html');

    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('<html>');
    expect(content).toContain('Login Test');
  });

  test('should generate JSON documentation', () => {
    const jsonGenerator = new TestDocGenerator({
      format: 'json',
      includeMetadata: true,
      includeCoverage: false,
      outputDir: docDir,
    });

    jsonGenerator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth'],
    });

    const filepath = jsonGenerator.generateDocumentation('test-doc.json');

    expect(fs.existsSync(filepath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    expect(content.tests.length).toBe(1);
  });

  test('should filter tests by tag', () => {
    generator.addTests([
      {
        testName: 'Login Test',
        description: 'Test login',
        purpose: 'Verify login',
        steps: ['Login'],
        expectedResult: 'Success',
        tags: ['auth', 'critical'],
      },
      {
        testName: 'Logout Test',
        description: 'Test logout',
        purpose: 'Verify logout',
        steps: ['Logout'],
        expectedResult: 'Success',
        tags: ['auth'],
      },
      {
        testName: 'Dashboard Test',
        description: 'Test dashboard',
        purpose: 'Verify dashboard',
        steps: ['Open dashboard'],
        expectedResult: 'Success',
        tags: ['ui'],
      },
    ]);

    const authTests = generator.getTestsByTag('auth');
    expect(authTests.length).toBe(2);
  });

  test('should count unique tags', () => {
    generator.addTests([
      {
        testName: 'Test 1',
        description: 'Test',
        purpose: 'Verify',
        steps: ['Step'],
        expectedResult: 'Success',
        tags: ['auth', 'critical'],
      },
      {
        testName: 'Test 2',
        description: 'Test',
        purpose: 'Verify',
        steps: ['Step'],
        expectedResult: 'Success',
        tags: ['auth', 'smoke'],
      },
    ]);

    expect(generator.getTagCount()).toBe(3);
  });

  test('should include test steps in documentation', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login works',
      steps: ['Navigate to login page', 'Enter credentials', 'Click login button'],
      expectedResult: 'User authenticated',
      tags: ['auth'],
    });

    const filepath = generator.generateDocumentation('test-doc.md');
    const content = fs.readFileSync(filepath, 'utf-8');

    expect(content).toContain('Navigate to login page');
    expect(content).toContain('Enter credentials');
    expect(content).toContain('Click login button');
  });

  test('should include preconditions and postconditions', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      preconditions: ['Database is running', 'Server is running'],
      postconditions: ['Session created', 'User logged in'],
      tags: ['auth'],
    });

    const filepath = generator.generateDocumentation('test-doc.md');
    const content = fs.readFileSync(filepath, 'utf-8');

    expect(content).toContain('Preconditions');
    expect(content).toContain('Database is running');
    expect(content).toContain('Postconditions');
    expect(content).toContain('Session created');
  });

  test('should include metadata in documentation', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth'],
    });

    const filepath = generator.generateDocumentation('test-doc.md');
    const content = fs.readFileSync(filepath, 'utf-8');

    expect(content).toContain('Metadata');
    expect(content).toContain('Total Tests: 1');
  });

  test('should export all formats', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth'],
    });

    const paths = generator.exportAllFormats('test-doc');

    expect(fs.existsSync(paths.markdown)).toBe(true);
    expect(fs.existsSync(paths.html)).toBe(true);
    expect(fs.existsSync(paths.json)).toBe(true);
  });

  test('should clear all tests', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth'],
    });

    generator.clear();

    expect(generator.getTestCount()).toBe(0);
  });

  test('should include tags in documentation', () => {
    generator.addTest({
      testName: 'Login Test',
      description: 'Test login',
      purpose: 'Verify login',
      steps: ['Login'],
      expectedResult: 'Success',
      tags: ['auth', 'critical', 'smoke'],
    });

    const filepath = generator.generateDocumentation('test-doc.md');
    const content = fs.readFileSync(filepath, 'utf-8');

    expect(content).toContain('Tags: auth, critical, smoke');
  });
});
