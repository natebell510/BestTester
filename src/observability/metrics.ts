import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { metrics as apiMetrics, Meter } from '@opentelemetry/api';

export interface MetricsConfig {
  serviceName: string;
  environment?: string;
  otlpEndpoint?: string;
}

export class TestMetrics {
  private meter: Meter;
  private config: MetricsConfig;

  // Metric instruments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private testDurationHistogram: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private assertionCountCounter: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private locatorResolutionHistogram: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private llmLatencyHistogram: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private testPassRateGauge: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeTestsGauge: any;

  constructor(config: MetricsConfig) {
    this.config = {
      environment: 'development',
      ...config,
    };

    this.meter = this.initializeMeter();
    this.initializeInstruments();
  }

  private initializeMeter(): Meter {
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        environment: this.config.environment,
      }),
    );

    const meterProvider = new MeterProvider({ resource });

    if (this.config.otlpEndpoint) {
      const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: this.config.otlpEndpoint,
        }),
      });
      meterProvider.addMetricReader(metricReader);
    }

    apiMetrics.setGlobalMeterProvider(meterProvider);
    return meterProvider.getMeter(this.config.serviceName);
  }

  private initializeInstruments(): void {
    // Test duration in milliseconds
    this.testDurationHistogram = this.meter.createHistogram('test.duration', {
      description: 'Duration of test execution in milliseconds',
      unit: 'ms',
    });

    // Assertion count
    this.assertionCountCounter = this.meter.createCounter('assertion.count', {
      description: 'Number of assertions executed',
      unit: '1',
    });

    // Locator resolution time
    this.locatorResolutionHistogram = this.meter.createHistogram('locator.resolution_time', {
      description: 'Time to resolve page locators in milliseconds',
      unit: 'ms',
    });

    // LLM call latency
    this.llmLatencyHistogram = this.meter.createHistogram('llm.latency', {
      description: 'Latency of LLM API calls in milliseconds',
      unit: 'ms',
    });

    // Test pass rate (0-100)
    this.testPassRateGauge = this.meter.createGauge('test.pass_rate', {
      description: 'Test pass rate percentage',
      unit: '%',
    });

    // Active tests count
    this.activeTestsGauge = this.meter.createGauge('tests.active', {
      description: 'Number of currently running tests',
      unit: '1',
    });
  }

  recordTestDuration(duration: number, attributes: Record<string, string | number> = {}): void {
    this.testDurationHistogram.record(duration, {
      'test.type': 'ui',
      ...attributes,
    });
  }

  recordAssertion(passed: boolean, attributes: Record<string, string | number> = {}): void {
    this.assertionCountCounter.add(1, {
      'assertion.passed': passed,
      ...attributes,
    });
  }

  recordLocatorResolution(duration: number, found: boolean): void {
    this.locatorResolutionHistogram.record(duration, {
      'locator.found': found,
    });
  }

  recordLLMLatency(duration: number, model: string): void {
    this.llmLatencyHistogram.record(duration, {
      'llm.model': model,
    });
  }

  setTestPassRate(passRate: number): void {
    this.testPassRateGauge.record(passRate);
  }

  setActiveTestCount(count: number): void {
    this.activeTestsGauge.record(count);
  }
}

export let globalMetrics: TestMetrics;

export function initializeGlobalMetrics(config: MetricsConfig): TestMetrics {
  globalMetrics = new TestMetrics(config);
  return globalMetrics;
}

export function getMetrics(): TestMetrics {
  if (!globalMetrics) {
    globalMetrics = new TestMetrics({
      serviceName: 'besttester',
      environment: process.env.NODE_ENV || 'development',
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  }
  return globalMetrics;
}
