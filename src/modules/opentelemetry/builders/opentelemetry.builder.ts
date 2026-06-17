import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { AlwaysOffSampler, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ConfigService } from '@nestjs/config';
import { INestElkLoggerService } from 'src/modules/elk-logger';
import { OpentelemetryConfig } from '../services/opentelemetry.config';
import { Propagator } from '../propagators/propagator';
import { ContextualTailSamplingExporter } from '../exporters/contextual-tail-sampling.exporter';

export abstract class OpentelemetryBuilder {
  private static otelSDK: NodeSDK;
  private static logger: INestElkLoggerService;
  private static hartShutdown: boolean = true;

  public static notUseHardShutdown() {
    OpentelemetryBuilder.hartShutdown = false;
  }

  public static build(configService: ConfigService, logger: INestElkLoggerService) {
    const config = new OpentelemetryConfig(configService);
    OpentelemetryBuilder.logger = logger;

    if (OpentelemetryBuilder.otelSDK) {
      return;
    }

    if (!config.getIsEnabled()) {
      this.otelSDK = new NodeSDK({
        sampler: new AlwaysOffSampler(),
      });
      this.otelSDK.start();

      process.on(config.getDestroySignal(), () => {
        if (OpentelemetryBuilder.hartShutdown) {
          OpentelemetryBuilder.shutdown();
        }
      });

      return;
    }

    const traceExporter = new OTLPTraceExporter({
      url: config.getUrl(),
    });

    const tailSamplingExporter = new ContextualTailSamplingExporter(traceExporter, config, OpentelemetryBuilder.logger);

    const baseBatchProcessor = new BatchSpanProcessor(tailSamplingExporter, {
      maxQueueSize: config.getBatchMaxQueueSize(),
      scheduledDelayMillis: config.getBatchScheduledDelay(),
    });

    OpentelemetryBuilder.otelSDK = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: [
          config.getApplicationName(),
          config.getMicroserviceName(),
          config.getMicroserviceVersion(),
        ].join('/'),
      }),
      textMapPropagator: new Propagator(),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-grpc': { enabled: false },
          '@opentelemetry/instrumentation-express': { enabled: false },
          '@opentelemetry/instrumentation-http': { enabled: false },
        }),
        new NestInstrumentation(),
      ],
      spanProcessors: [baseBatchProcessor],
    });

    OpentelemetryBuilder.otelSDK.start();

    process.on(config.getDestroySignal(), () => {
      if (OpentelemetryBuilder.hartShutdown) {
        OpentelemetryBuilder.shutdown();
      }
    });
  }

  public static async shutdown(): Promise<void> {
    if (OpentelemetryBuilder.otelSDK) {
      return OpentelemetryBuilder.otelSDK
        .shutdown()
        .then(() => OpentelemetryBuilder.logger?.log('OpenTelemetry: SDK shut down successfully'))
        .catch((error) => OpentelemetryBuilder.logger?.error('OpenTelemetry: Error shutting down SDK', error));
    }
  }
}
