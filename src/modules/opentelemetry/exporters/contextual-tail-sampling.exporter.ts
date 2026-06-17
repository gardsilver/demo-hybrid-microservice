import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import { INestElkLoggerService } from 'src/modules/elk-logger';
import { OpentelemetryConfig } from '../services/opentelemetry.config';

export class ContextualTailSamplingExporter implements SpanExporter {
  constructor(
    private readonly downstreamExporter: SpanExporter,
    private readonly config: OpentelemetryConfig,
    private logger: INestElkLoggerService,
  ) {}

  public export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (!spans || spans.length === 0) {
      return resultCallback({ code: ExportResultCode.SUCCESS });
    }

    const tracesMap = new Map<string, ReadableSpan[]>();
    for (const span of spans) {
      const traceId = span.spanContext().traceId;
      if (!tracesMap.has(traceId)) {
        tracesMap.set(traceId, []);
      }
      tracesMap.get(traceId)!.push(span);
    }

    const spansToExport: ReadableSpan[] = [];
    const ignoredEndpoints = this.config.getIgnoredEndpoints();
    const forcedThreshold = this.config.getForcedDurationThreshold();

    for (const [traceId, traceSpans] of tracesMap.entries()) {
      let spanIgnored: ReadableSpan | undefined;
      for (const span of traceSpans) {
        if (ignoredEndpoints.some((endpoint) => span.name.toLowerCase().includes(endpoint.toLowerCase()))) {
          spanIgnored = span;
          break;
        }
      }

      if (spanIgnored !== undefined) {
        if (this.logger.debug) {
          this.logger.debug(
            `[OTel Tail-Exporter] DROPPED by Ignore-List: Trace [${traceId}]. SpanIgnored[${spanIgnored.name}][${spanIgnored.spanContext().spanId}]. Spans skipped: ${traceSpans.length}`,
          );
        }

        continue;
      }

      const hasErrors = traceSpans.some((span) => span.status.code === SpanStatusCode.ERROR);

      let minStartTimeNs = Infinity;
      let maxEndTimeNs = -Infinity;

      for (const span of traceSpans) {
        const [startSec, startNano] = span.startTime as unknown as [number, number];
        const [endSec, endNano] = span.endTime as unknown as [number, number];

        const currentStartNs = startSec * 1000000000 + startNano;
        const currentEndNs = endSec * 1000000000 + endNano;

        if (currentStartNs < minStartTimeNs) minStartTimeNs = currentStartNs;
        if (currentEndNs > maxEndTimeNs) maxEndTimeNs = currentEndNs;
      }

      const durationMillis = (maxEndTimeNs - minStartTimeNs) / 1000000;
      const isAnomalyDuration = durationMillis >= forcedThreshold;

      if (hasErrors || isAnomalyDuration) {
        if (this.logger.debug) {
          this.logger.debug(
            `[OTel Tail-Exporter] FORWARDING Trace [${traceId}]. Spans: ${traceSpans.length}, Errors: ${hasErrors}, Duration: ${durationMillis.toFixed(2)}ms (Threshold: ${forcedThreshold}ms)`,
          );
        }
        spansToExport.push(...traceSpans);
      } else {
        if (this.logger.debug) {
          this.logger.debug(
            `[OTel Tail-Exporter] DROPPED Successful Trace [${traceId}]. Spans: ${traceSpans.length}, Duration: ${durationMillis.toFixed(2)}ms`,
          );
        }
      }
    }

    if (spansToExport.length === 0) {
      return resultCallback({ code: ExportResultCode.SUCCESS });
    }

    return this.downstreamExporter.export(spansToExport, resultCallback);
  }

  public async shutdown(): Promise<void> {
    await this.downstreamExporter.shutdown();
  }

  public async forceFlush(): Promise<void> {
    if (this.downstreamExporter.forceFlush) {
      await this.downstreamExporter.forceFlush();
    }
  }
}
