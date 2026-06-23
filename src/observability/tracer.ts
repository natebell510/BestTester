import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BasicTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Tracer, Span, SpanStatusCode, type SpanOptions } from '@opentelemetry/api';

export interface TracerConfig {
  serviceName: string;
  environment?: 'development' | 'staging' | 'production';
  enableConsoleExport?: boolean;
  otlpEndpoint?: string;
  sampleRate?: number;
}

export class TestTracer {
  private tracer: Tracer;
  private config: TracerConfig;
  private sdk?: NodeSDK;
  private activeSpans: Map<string, Span> = new Map();

  constructor(config: TracerConfig) {
    this.config = {
      environment: 'development',
      enableConsoleExport: true,
      sampleRate: 1.0,
      ...config,
    };

    this.tracer = this.initializeTracer();
  }

  private initializeTracer(): Tracer {
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        environment: this.config.environment,
      }),
    );

    const tracerProvider = new BasicTracerProvider({ resource });

    if (this.config.enableConsoleExport) {
      tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    if (this.config.otlpEndpoint) {
      const otlpExporter = new OTLPTraceExporter({
        url: this.config.otlpEndpoint,
      });
      tracerProvider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));
    }

    return tracerProvider.getTracer(this.config.serviceName);
  }

  startTestSpan(
    testName: string,
    attributes: Record<string, string | number | boolean> = {},
  ): Span {
    const span = this.tracer.startSpan(`test: ${testName}`, {
      attributes: {
        'test.name': testName,
        'test.type': 'test',
        ...attributes,
      },
    });

    this.activeSpans.set(testName, span);
    return span;
  }

  startPageActionSpan(parentSpan: Span, action: string, selector: string): Span {
    const spanOptions: SpanOptions = {
      attributes: {
        'page.action': action,
        'page.selector': selector,
      },
    };

    return this.tracer.startSpan(`page: ${action}`, spanOptions);
  }

  startAPICallSpan(parentSpan: Span, method: string, url: string): Span {
    const spanOptions: SpanOptions = {
      attributes: {
        'http.method': method,
        'http.url': url,
      },
    };

    return this.tracer.startSpan(`api: ${method} ${url}`, spanOptions);
  }

  recordAPIResponse(span: Span, statusCode: number, latency: number): void {
    span.setAttributes({
      'http.status_code': statusCode,
      'http.duration_ms': latency,
    });

    if (statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${statusCode}`,
      });
    }
  }

  recordAssertion(span: Span, assertion: string, result: boolean): void {
    const childSpan = this.tracer.startSpan(`assertion: ${assertion}`, {
      attributes: {
        'assertion.name': assertion,
        'assertion.result': result,
      },
    });

    if (!result) {
      childSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Assertion failed',
      });
    }

    childSpan.end();
  }

  recordLocatorResolution(span: Span, selector: string, duration: number, found: boolean): void {
    const childSpan = this.tracer.startSpan(`locator: ${selector}`, {
      attributes: {
        'locator.selector': selector,
        'locator.duration_ms': duration,
        'locator.found': found,
      },
    });

    if (!found) {
      childSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Element not found',
      });
    }

    childSpan.end();
  }

  recordLLMCall(span: Span, model: string, prompt: string, duration: number): void {
    const childSpan = this.tracer.startSpan(`llm: ${model}`, {
      attributes: {
        'llm.model': model,
        'llm.prompt_length': prompt.length,
        'llm.duration_ms': duration,
      },
    });

    childSpan.end();
  }

  endTestSpan(testName: string, passed: boolean, error?: string): void {
    const span = this.activeSpans.get(testName);

    if (span) {
      span.setAttributes({
        'test.passed': passed,
      });

      if (!passed) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error || 'Test failed',
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
      this.activeSpans.delete(testName);
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }
}

export let globalTracer: TestTracer;

export function initializeGlobalTracer(config: TracerConfig): TestTracer {
  globalTracer = new TestTracer(config);
  return globalTracer;
}

export function getTracer(): TestTracer {
  if (!globalTracer) {
    globalTracer = new TestTracer({
      serviceName: 'besttester',
      environment: (process.env.NODE_ENV as any) || 'development',
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  }
  return globalTracer;
}
