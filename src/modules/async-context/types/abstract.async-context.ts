/* eslint-disable @typescript-eslint/no-explicit-any */
import { AsyncLocalStorage } from 'node:async_hooks';
import { trace, context as otelContext, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { EmptyAsyncContextError, GetAsyncContextValueType, IAsyncContext } from './types';
import { copyMetadata } from 'src/modules/common/utils';
import { ProcessTraceSpanStore } from 'src/modules/elk-logger/services/process-trace-span.store';

const asyncLocalStorage = new AsyncLocalStorage();

export abstract class AbstractAsyncContext<T = IAsyncContext> {
  public static instance: AbstractAsyncContext<any>;

  // Имя для трейсера системных процессов
  protected abstract getTracerName(): string;

  private static getStore(): any {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new EmptyAsyncContextError();
    }
    return store;
  }

  /**
   * Публичный метод для запуска телеметрии и контекста, чтобы декоратор имел к нему доступ извне.
   * Обертка для связывания Node.js AsyncLocalStorage и OpenTelemetry Context.
   * Гарантирует появление живого спана для любого изолированного процесса.
   */
  public wrapWithTelemetry(contextFields: any, operationName: string, executionBlock: () => any): any {
    const tracer = trace.getTracer(this.getTracerName());
    const globalBootstrapContext = ProcessTraceSpanStore.instance.get();

    let parentOtelContext = otelContext.active();
    const currentActiveSpanContext = trace.getSpanContext(parentOtelContext);

    const hasValidActiveOtelContext =
      currentActiveSpanContext && currentActiveSpanContext.traceId !== '00000000000000000000000000000000';

    if (hasValidActiveOtelContext) {
      const span = tracer.startSpan(operationName, {}, parentOtelContext);
      const spanContext = span.spanContext();

      const enrichedContext = {
        ...contextFields,
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        parentSpanId: currentActiveSpanContext.spanId,
        initialSpanId: contextFields?.initialSpanId || currentActiveSpanContext.spanId,
      };

      const otelActiveContext = trace.setSpan(parentOtelContext, span);

      return otelContext.with(otelActiveContext, () => {
        return asyncLocalStorage.run(enrichedContext, () => {
          return this.executeAndLifecycleSpan(span, executionBlock);
        });
      });
    }

    if (contextFields?.traceId) {
      const otelParentSpanId = contextFields.parentSpanId || '0000000000000000';

      const customParentSpanContext = {
        traceId: contextFields.traceId.padStart(32, '0'),
        spanId: otelParentSpanId.padStart(16, '0'),
        traceFlags: TraceFlags.SAMPLED,
        isRemote: true,
      };

      parentOtelContext = trace.setSpanContext(otelContext.active(), customParentSpanContext);
    } else if (
      globalBootstrapContext.traceId &&
      (!currentActiveSpanContext || currentActiveSpanContext.traceId === '00000000000000000000000000000000')
    ) {
      const mockParentSpanContext = {
        traceId: globalBootstrapContext.traceId,
        spanId: globalBootstrapContext.spanId,
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      };
      parentOtelContext = trace.setSpanContext(otelContext.active(), mockParentSpanContext);
    }

    const span = tracer.startSpan(operationName, {}, parentOtelContext);
    const spanContext = span.spanContext();

    const enrichedContext = {
      ...contextFields,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      parentSpanId: contextFields?.parentSpanId || trace.getSpanContext(parentOtelContext)?.spanId || '',
    };

    const otelActiveContext = trace.setSpan(parentOtelContext, span);

    return otelContext.with(otelActiveContext, () => {
      return asyncLocalStorage.run(enrichedContext, () => {
        return this.executeAndLifecycleSpan(span, executionBlock);
      });
    });
  }

  private executeAndLifecycleSpan(span: any, executionBlock: () => any): any {
    try {
      const result = executionBlock();
      if (result instanceof Promise) {
        return result
          .then((res) => {
            span.setStatus({ code: SpanStatusCode.OK });
            return res;
          })
          .catch((err) => {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            throw err;
          })
          .finally(() => span.end());
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    } finally {
      asyncLocalStorage.exit(() => {});
    }
  }

  /**
   * Фабрика декоратора. Принимает инстанс конкретного контекста выполнения.
   */
  public static define<T = IAsyncContext>(initCallback?: (...methodsArgs: any[]) => T): MethodDecorator {
    // В момент вызова декоратора (например, @JobAsyncContext.define)
    // переменная `this` указывает на сам класс `JobAsyncContext`!
    const contextClass = this as any;

    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      const methodName = String(propertyKey);
      const className = target.constructor?.name ?? 'SystemProcess';

      const wrappedMethod = function (this: any, ...args: any[]) {
        const contextInstance = contextClass.instance;

        if (!contextInstance) {
          throw new Error(
            `Не удалось перехватить контекст. Убедитесь, что класс ${contextClass.name} корректно инициализирует статическое свойство instance.`,
          );
        }

        const initialFields = initCallback ? initCallback(...args) : {};
        const operationName = `job:${className}.${methodName}`;

        return contextInstance.wrapWithTelemetry(initialFields, operationName, () => {
          return originalMethod.apply(this, args);
        });
      };

      copyMetadata(wrappedMethod, originalMethod);
      descriptor.value = wrappedMethod;
      return descriptor;
    };
  }

  public runWithContext<R, K extends keyof T>(
    originalMethod: () => R,
    context: { [key in K]: GetAsyncContextValueType<T, K> },
    customOperationName = 'isolated_task',
  ): R {
    return this.wrapWithTelemetry(context, customOperationName, originalMethod);
  }

  public async runWithContextAsync<R, K extends keyof T>(
    originalMethod: () => Promise<R>,
    context: { [key in K]: GetAsyncContextValueType<T, K> },
    customOperationName = 'isolated_async_task',
  ): Promise<R> {
    return this.wrapWithTelemetry(context, customOperationName, originalMethod);
  }

  /** Получение значения переменной контекста по ключу */
  public get<K extends keyof T>(key: K): GetAsyncContextValueType<T, K> | undefined {
    return AbstractAsyncContext.getStore()[key];
  }

  /** Безопасное получение значения переменной контекста по ключу */
  public getSafe<K extends keyof T>(key: K): GetAsyncContextValueType<T, K> | undefined {
    try {
      return AbstractAsyncContext.getStore()[key];
    } catch {
      // Nothing
    }
  }

  /** Получение всех значения контекста */
  public extend(): T {
    try {
      return Object.assign({}, AbstractAsyncContext.getStore()) as T;
    } catch {
      return {} as T;
    }
  }

  public set<K extends keyof T>(key: K, value: GetAsyncContextValueType<T, K>): void {
    AbstractAsyncContext.getStore()[key] = value;
  }

  public setMultiple<K extends keyof T>(values: { [key in K]: GetAsyncContextValueType<T, K> }): void {
    const store = AbstractAsyncContext.getStore();

    Object.keys(values).forEach((key) => (store[key] = values[key as K]));
  }
}
