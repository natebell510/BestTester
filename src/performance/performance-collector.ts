import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  url: string;
  timestamp: string;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  ttfb: number | null;
  fcp: number | null;
  domContentLoaded: number | null;
  loadComplete: number | null;
}

export class PerformanceCollector {
  async collectMetrics(page: Page): Promise<PerformanceMetrics> {
    const pageUrl = page.url();
    const navigationTiming = await page.evaluate(() => {
      const perfData = window.performance.timing;
      return {
        navigationStart: perfData.navigationStart,
        responseStart: perfData.responseStart,
        domInteractive: perfData.domInteractive,
        domComplete: perfData.domComplete,
        loadEventEnd: perfData.loadEventEnd,
      };
    });

    const paintEntries = await page.evaluate(() => {
      return performance.getEntriesByType('paint').map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
      }));
    });

    const largestContentfulPaint = await page.evaluate(() => {
      return new Promise<number | null>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        setTimeout(() => resolve(null), 5000);
      });
    });

    const cumulativeLayoutShift = await page.evaluate(() => {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) {
            continue;
          }
          cls += (entry as any).value;
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      return cls;
    });

    const interactionToNextPaint = await page.evaluate(() => {
      return new Promise<number | null>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            resolve((lastEntry as any).processingDuration);
          }
        });
        observer.observe({ entryTypes: ['interaction'] });
        setTimeout(() => resolve(null), 5000);
      });
    });

    const fcpTime =
      paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || null;
    const ttfbTime = navigationTiming.responseStart - navigationTiming.navigationStart;
    const domContentLoadedTime = navigationTiming.domComplete - navigationTiming.navigationStart;
    const loadCompleteTime = navigationTiming.loadEventEnd - navigationTiming.navigationStart;

    return {
      url: pageUrl,
      timestamp: new Date().toISOString(),
      lcp: largestContentfulPaint || null,
      inp: interactionToNextPaint || null,
      cls: cumulativeLayoutShift || null,
      ttfb: ttfbTime > 0 ? ttfbTime : null,
      fcp: fcpTime || null,
      domContentLoaded: domContentLoadedTime > 0 ? domContentLoadedTime : null,
      loadComplete: loadCompleteTime > 0 ? loadCompleteTime : null,
    };
  }

  async waitForMetricsStability(page: Page, timeout = 10000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  calculateWebVitals(metrics: PerformanceMetrics): Record<string, string> {
    const vitals: Record<string, string> = {};

    if (metrics.lcp !== null) {
      vitals.LCP =
        metrics.lcp < 2500 ? '✅ Good' : metrics.lcp < 4000 ? '⚠️ Needs Improvement' : '❌ Poor';
    }

    if (metrics.inp !== null) {
      vitals.INP =
        metrics.inp < 200 ? '✅ Good' : metrics.inp < 500 ? '⚠️ Needs Improvement' : '❌ Poor';
    }

    if (metrics.cls !== null) {
      vitals.CLS =
        metrics.cls < 0.1 ? '✅ Good' : metrics.cls < 0.25 ? '⚠️ Needs Improvement' : '❌ Poor';
    }

    if (metrics.ttfb !== null) {
      vitals.TTFB =
        metrics.ttfb < 800 ? '✅ Good' : metrics.ttfb < 1800 ? '⚠️ Needs Improvement' : '❌ Poor';
    }

    return vitals;
  }
}
