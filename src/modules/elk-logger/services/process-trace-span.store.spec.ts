/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { trace, context, Span, SpanContext } from '@opentelemetry/api';
import { ProcessTraceSpanStore } from './process-trace-span.store'; // Скорректируйте путь
import { TraceSpanHelper } from '../helpers/trace-span.helper';

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getSpanContext: jest.fn(),
  },
  context: {
    active: jest.fn(),
  },
}));

jest.mock('../helpers/trace-span.helper', () => ({
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('generated-fallback-trace-id-32ch'),
    generateSpanId: jest.fn().mockReturnValue('generated-span-id'),
  },
}));

describe('ProcessTraceSpanStore', () => {
  let store: ProcessTraceSpanStore;

  beforeEach(() => {
    jest.clearAllMocks();

    // Сбрасываем синглтон перед каждым тестом для полной изоляции
    (ProcessTraceSpanStore as any)._instance = undefined;
    store = ProcessTraceSpanStore.instance;
  });

  it('должен возвращать один и тот же инстанс класса (Паттерн Singleton)', () => {
    const anotherInstance = ProcessTraceSpanStore.instance;
    expect(store).toBe(anotherInstance);
  });

  describe('Метод get()', () => {
    it('Сценарий 1: Идет сборка приложения (задан bootstrapSpan) — должен жестко отдавать ID спана сборки', () => {
      const mockSpanContext: Partial<SpanContext> = {
        traceId: 'bootstrap-trace-id-32-chars-long',
        spanId: 'bootstrap-span-id-16',
      };

      // Имитируем Span от OpenTelemetry
      const mockSpan = {
        spanContext: jest.fn().mockReturnValue(mockSpanContext),
      } as unknown as Span;

      store.setBootstrapSpan(mockSpan);

      const result = store.get();

      expect(mockSpan.spanContext).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        traceId: 'bootstrap-trace-id-32-chars-long',
        spanId: 'bootstrap-span-id-16',
        parentSpanId: '',
        initialSpanId: '',
      });
    });

    it('Сценарий 1.1: clearBootstrapSpan должен очищать спан сборки', () => {
      const mockSpan = {
        spanContext: jest.fn().mockReturnValue({ traceId: 'id', spanId: 'id' }),
      } as unknown as Span;

      store.setBootstrapSpan(mockSpan);
      store.clearBootstrapSpan();

      // Настраиваем фолбек, чтобы метод get не упал
      (trace.getSpanContext as jest.Mock).mockReturnValue(undefined);

      store.get();
      // Проверяем, что к очищенному спану больше нет обращений
      expect(mockSpan.spanContext).not.toHaveBeenCalled();
    });

    it('Сценарий 2: Сборка завершена, есть активный контекст выполнения (HTTP/Kafka/RMQ запрос)', () => {
      // 1. Убеждаемся, что bootstrap спан пустой
      store.clearBootstrapSpan();

      // 2. Настраиваем возврат валидного активного контекста OpenTelemetry
      const mockActiveSpanContext: Partial<SpanContext> = {
        traceId: 'active-request-trace-id-32-chars',
        spanId: 'active-request-span-id',
      };
      (context.active as jest.Mock).mockReturnValue({});
      (trace.getSpanContext as jest.Mock).mockReturnValue(mockActiveSpanContext);

      const result = store.get();

      expect(context.active).toHaveBeenCalledTimes(1);
      expect(trace.getSpanContext).toHaveBeenCalledWith({});
      expect(result).toEqual({
        traceId: 'active-request-trace-id-32-chars',
        spanId: 'active-request-span-id',
        parentSpanId: '',
        initialSpanId: '',
      });
    });

    it('Сценарий 3: Полный фолбек. Контекстов нет — должен сгенерировать стабильное значение уровня процесса один раз', () => {
      store.clearBootstrapSpan();

      // Имитируем пустой (нулевой) контекст OpenTelemetry
      const mockZeroSpanContext: Partial<SpanContext> = {
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
      };
      (trace.getSpanContext as jest.Mock).mockReturnValue(mockZeroSpanContext);

      // Первый вызов — срабатывает генерация через хелпер
      const firstResult = store.get();

      expect(TraceSpanHelper.generateTraceId).toHaveBeenCalledTimes(1);
      expect(TraceSpanHelper.generateSpanId).toHaveBeenCalledTimes(1);
      expect(firstResult).toEqual({
        traceId: 'generated-fallback-trace-id-32ch',
        spanId: 'generated-span-id',
        parentSpanId: '',
        initialSpanId: '',
      });

      // Второй вызов — должен отдать закешированное в processValue значение, не вызывая генератор повторно
      const secondResult = store.get();

      expect(TraceSpanHelper.generateTraceId).toHaveBeenCalledTimes(1); // Количество вызовов не изменилось
      expect(secondResult).toEqual(firstResult);
    });

    it('Сценарий 3.1: Полный фолбек при возврате undefined от OpenTelemetry API', () => {
      store.clearBootstrapSpan();

      // Имитируем ситуацию, когда AsyncLocalStorage вообще не вернул объект контекста (undefined)
      (trace.getSpanContext as jest.Mock).mockReturnValue(undefined);

      const result = store.get();

      expect(TraceSpanHelper.generateTraceId).toHaveBeenCalledTimes(1);
      expect(result.traceId).toBe('generated-fallback-trace-id-32ch');
    });
  });
});
