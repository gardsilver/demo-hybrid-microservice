import { ITraceSpan } from '../types/trace-span';
import { TraceSpanBuilder } from '../builders/trace-span.builder';

/**
 * Глобальный fallback-контекст трассировки уровня процесса.
 * Используется, когда нет ни asyncLocalStorage-контекста, ни явных полей в записи лога —
 * вместо генерации новых traceId/spanId на каждый лог отдаётся стабильное значение,
 * созданное один раз за время жизни процесса.
 */
export class ProcessTraceSpanStore {
  private static _instance: ProcessTraceSpanStore | undefined;
  private value: ITraceSpan | undefined;

  public static get instance(): ProcessTraceSpanStore {
    if (!ProcessTraceSpanStore._instance) {
      ProcessTraceSpanStore._instance = new ProcessTraceSpanStore();
    }

    return ProcessTraceSpanStore._instance;
  }

  public get(): ITraceSpan {
    if (!this.value) {
      this.value = TraceSpanBuilder.build();
    }

    return this.value;
  }

  public reset(): void {
    this.value = undefined;
  }
}
