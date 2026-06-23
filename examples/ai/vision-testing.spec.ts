/* eslint-disable no-console */
/**
 * @fileoverview Vision-Based Testing Pattern
 *
 * Demonstrates best practices for using Claude's vision capabilities
 * to test UI quality without brittle selectors:
 * - Visual design evaluation
 * - Accessibility assessment
 * - Content placement verification
 * - Responsive design validation
 * - Hallucination detection
 *
 * When to use: High-level UI quality checks, design compliance
 * Common pitfalls:
 *  - Using too low thresholds (don't rely on AI alone)
 *  - Evaluating too much content at once (split pages into regions)
 *  - Not combining with traditional assertions
 *  - Not validating same content across devices
 *
 * @example
 * npm run test:ai -- vision-testing.spec.ts
 */

import { test, expect } from '@playwright/test';
import { LLMJudge } from '@src/ai/llm-judge';

test.describe('Vision-Based Testing @ai @ui', () => {
  const judge = new LLMJudge();

  test('should have professional hero section', async ({ page }) => {
    await page.goto('https://example.com');

    // Capture hero area
    const heroScreenshot = await page.locator('[data-testid="hero"]').screenshot();

    const result = await judge.evaluate({
      screenshot: heroScreenshot,
      rubric: `
        Evaluate the hero section design:
        - Clear value proposition in large text
        - Professional color scheme (no clashing colors)
        - Call-to-action button is prominent
        - Image/visual is high quality
        - Proper spacing and alignment
      `,
      threshold: 0.75,
    });

    console.log(`Hero section score: ${result.score}`);
    console.log(`Feedback: ${result.feedback}`);

    expect(result.score).toBeGreaterThan(0.75);
  });

  test('should display navigation correctly', async ({ page }) => {
    await page.goto('https://example.com');

    const navScreenshot = await page.locator('[data-testid="navigation"]').screenshot();

    const result = await judge.evaluate({
      screenshot: navScreenshot,
      rubric: `
        Does the navigation meet these criteria?
        - Logo is visible and properly sized
        - Menu items are clearly labeled
        - Links are properly spaced (click targets > 44px)
        - Active menu item is highlighted
        - No overlapping elements
      `,
      threshold: 0.8,
    });

    expect(result.score).toBeGreaterThan(0.8);
  });

  test('should be accessible across devices', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile iPhone' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto('https://example.com');
      const screenshot = await page.screenshot();

      const result = await judge.evaluate({
        screenshot,
        rubric: `
          On ${viewport.name}:
          - All content is readable without horizontal scroll
          - Touch targets are appropriately sized
          - Images scale properly
          - Typography is readable (min 12px)
          - No text is cut off
          - Layout adapts to screen size
        `,
        threshold: 0.75,
      });

      console.log(`${viewport.name}: ${result.score}`);
      expect(result.score).toBeGreaterThan(0.75);
    }
  });

  test('should validate form design quality', async ({ page }) => {
    await page.goto('https://example.com/contact-form');

    const screenshot = await page.screenshot();

    const result = await judge.evaluate({
      screenshot,
      rubric: `
        Evaluate the form design:
        - Labels are clearly associated with inputs
        - Inputs have visible focus states
        - Required fields are marked
        - Error messages will be visible
        - Button text is action-oriented
        - Form has good visual hierarchy
      `,
      threshold: 0.7,
    });

    expect(result.score).toBeGreaterThan(0.7);
  });

  test('should detect design consistency', async ({ page }) => {
    const pages = [
      'https://example.com',
      'https://example.com/about',
      'https://example.com/contact',
    ];

    const screenshots = [];

    for (const url of pages) {
      await page.goto(url);
      screenshots.push({
        page: url.split('/').pop() || 'home',
        image: await page.screenshot(),
      });
    }

    // Evaluate all pages have consistent design
    const result = await judge.evaluate({
      screenshot: screenshots[0].image,
      rubric: `
        Do these pages look like they're part of the same site?
        - Same color scheme
        - Consistent typography
        - Matching navigation style
        - Similar spacing/layout patterns
      `,
      threshold: 0.8,
    });

    expect(result.score).toBeGreaterThan(0.8);
  });

  test('should verify content highlighting', async ({ page }) => {
    await page.goto('https://example.com/pricing');

    // Get screenshot of pricing cards
    const pricingScreenshot = await page.locator('[data-testid="pricing-cards"]').screenshot();

    const result = await judge.evaluate({
      screenshot: pricingScreenshot,
      rubric: `
        Evaluate pricing card presentation:
        - Recommended plan is visually highlighted
        - Prices are clearly visible
        - Feature lists are easy to scan
        - Call-to-action buttons are prominent
        - Cards have good visual separation
      `,
      threshold: 0.75,
    });

    expect(result.score).toBeGreaterThan(0.75);
  });

  test('should validate footer information', async ({ page }) => {
    await page.goto('https://example.com');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footerScreenshot = await page.locator('[data-testid="footer"]').screenshot();

    const result = await judge.evaluate({
      screenshot: footerScreenshot,
      rubric: `
        Is the footer well-organized?
        - Links are organized into clear sections
        - Contact information is visible
        - Social media links are present
        - Copyright notice is visible
        - No broken layout or overflow
      `,
      threshold: 0.7,
    });

    expect(result.score).toBeGreaterThan(0.7);
  });

  test('should detect visual regressions', async ({ page }) => {
    await page.goto('https://example.com/dashboard');

    const currentScreenshot = await page.screenshot();

    // Compare against baseline (in real scenario, this would be stored)
    const result = await judge.evaluate({
      screenshot: currentScreenshot,
      rubric: `
        Compare this dashboard to its baseline:
        - All expected widgets are present
        - Widgets are in expected positions
        - No overlapping elements
        - Chart data is visible and readable
        - Colors match the design system
      `,
      threshold: 0.85,
    });

    if (result.score < 0.85) {
      // Visual regression detected
      console.warn('Visual regression detected:', result.feedback);
    }

    expect(result.score).toBeGreaterThan(0.85);
  });

  test('should validate chart readability', async ({ page }) => {
    await page.goto('https://example.com/analytics');

    const chartScreenshot = await page.locator('[data-testid="chart"]').screenshot();

    const result = await judge.evaluate({
      screenshot: chartScreenshot,
      rubric: `
        Is the chart readable and professional?
        - Axes are labeled
        - Legend is clear
        - Data points are visible
        - Colors are distinguishable
        - Title explains what is shown
        - Units are displayed (currency, percentage, etc)
      `,
      threshold: 0.75,
    });

    expect(result.score).toBeGreaterThan(0.75);
  });

  test('should evaluate empty state design', async ({ page }) => {
    await page.goto('https://example.com/files');

    // Assume no files scenario
    const emptyStateScreenshot = await page.locator('[data-testid="empty-state"]').screenshot();

    const result = await judge.evaluate({
      screenshot: emptyStateScreenshot,
      rubric: `
        Is the empty state helpful and designed well?
        - Clear message explaining why content is empty
        - Icon or illustration communicates the state
        - Action button to create/add content
        - Friendly tone (not error-like)
        - Visually cohesive with the app
      `,
      threshold: 0.7,
    });

    expect(result.score).toBeGreaterThan(0.7);
  });

  test('should detect text readability issues', async ({ page }) => {
    await page.goto('https://example.com/article');

    const contentScreenshot = await page.locator('main').screenshot();

    const result = await judge.evaluate({
      screenshot: contentScreenshot,
      rubric: `
        Is the content easy to read?
        - Text color has sufficient contrast
        - Line length is appropriate (not too wide)
        - Line height provides breathing room
        - Font size is readable (no smaller than 12px)
        - No text overlapping backgrounds
      `,
      threshold: 0.8,
    });

    expect(result.score).toBeGreaterThan(0.8);
  });
});
