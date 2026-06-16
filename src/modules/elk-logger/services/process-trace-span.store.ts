import { trace, context, Span } from '@opentelemetry/api';
import { ITraceSpan } from '../types/trace-span';
import { TraceSpanHelper } from '../helpers/trace-span.helper';

/**
 * Глобальный fallback-контекст трассировки уровня процесса.
 * Используется, когда нет ни asyncLocalStorage-контекста, ни явных полей в записи лога —
 * вместо генерации новых traceId/spanId на каждый лог отдаётся стабильное значение,
 * созданное один раз за время жизни процесса.
 */
export class ProcessTraceSpanStore {
  private static _instance: ProcessTraceSpanStore | undefined;

  private bootstrapSpan: Span | undefined;
  private processValue: ITraceSpan | undefined;

  public static get instance(): ProcessTraceSpanStore {
    if (!ProcessTraceSpanStore._instance) {
      ProcessTraceSpanStore._instance = new ProcessTraceSpanStore();
    }
    return ProcessTraceSpanStore._instance;
  }

  public setBootstrapSpan(span: Span): void {
    this.bootstrapSpan = span;
  }

  public clearBootstrapSpan(): void {
    this.bootstrapSpan = undefined;
  }

  public get(): ITraceSpan {
    // 1. Если идет сборка приложения — жестко отдаем ID спана сборки
    if (this.bootstrapSpan) {
      const spanContext = this.bootstrapSpan.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        parentSpanId: '',
        initialSpanId: '',
      };
    }

    // 2. Если сборка завершена, проверяем контекст HTTP/Kafka-запроса
    const activeSpanContext = trace.getSpanContext(context.active());
    if (activeSpanContext && activeSpanContext.traceId !== '00000000000000000000000000000000') {
      return {
        traceId: activeSpanContext.traceId,
        spanId: activeSpanContext.spanId,
        parentSpanId: '',
        initialSpanId: '',
      };
    }

    // 3. Фолбек уровня процесса
    if (!this.processValue) {
      this.processValue = {
        traceId: TraceSpanHelper.generateTraceId(),
        spanId: TraceSpanHelper.generateSpanId(),
        parentSpanId: '',
        initialSpanId: '',
      };
    }

    return this.processValue;
  }
}
