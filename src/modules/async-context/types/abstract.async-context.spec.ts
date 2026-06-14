/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { trace, TraceFlags, SpanStatusCode } from '@opentelemetry/api';

jest.mock('src/modules/elk-logger', () => {
  return {
    __esModule: true,
    ProcessTraceSpanStore: {
      instance: {
        get: jest.fn().mockReturnValue({
          traceId: 'bootstrap-trace-id-32-chars-long',
          spanId: 'bootstrap-span-id',
        }),
      },
    },
  };
});

jest.mock('@opentelemetry/api', () => {
  const original = jest.requireActual('@opentelemetry/api');
  return {
    ...original,
    trace: {
      getTracer: jest.fn().mockReturnValue({
        startSpan: jest.fn().mockReturnValue({
          spanContext: jest.fn().mockReturnValue({
            traceId: 'mocked-otel-trace-id-32-chars-long',
            spanId: 'mocked-otel-span',
            traceFlags: 1,
          }),
          setStatus: jest.fn(),
          recordException: jest.fn(),
          end: jest.fn(),
        }),
      }),
      getSpanContext: jest.fn(),
      setSpan: jest.fn().mockReturnValue({}),
      setSpanContext: jest.fn().mockReturnValue({}),
    },
    context: {
      active: jest.fn().mockReturnValue({}),
      with: jest.fn((ctx, cb) => cb()),
    },
  };
});

import { IGeneralAsyncContext } from 'src/modules/common/context';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { AbstractAsyncContext } from './abstract.async-context';
import { EmptyAsyncContextError, IAsyncContext } from './types';

interface ITestAsyncContext extends IGeneralAsyncContext {
  startTimestamp: number;
}

class TestAsyncContext extends AbstractAsyncContext<ITestAsyncContext> {
  public static override instance = new TestAsyncContext();

  protected getTracerName(): string {
    return 'test-process-context';
  }
}

describe(AbstractAsyncContext.name, () => {
  let contextInstance: TestAsyncContext;
  let mockFields: ITestAsyncContext;

  beforeEach(() => {
    jest.clearAllMocks();
    contextInstance = TestAsyncContext.instance;

    AbstractAsyncContext.instance = TestAsyncContext.instance;

    mockFields = generalAsyncContextFactory.build({
      traceId: undefined,
      spanId: undefined,
      parentSpanId: undefined,
      startTimestamp: faker.number.int(),
    }) as unknown as ITestAsyncContext;
  });

  describe('Управление локальным хранилищем (Базовые методы)', () => {
    it('должен выбрасывать EmptyAsyncContextError, если хранилище еще не инициализировано', () => {
      expect(() => contextInstance.get('startTimestamp')).toThrow(EmptyAsyncContextError);
    });

    it('должен безопасно возвращать undefined через getSafe, если хранилище пустое', () => {
      expect(contextInstance.getSafe('startTimestamp')).toBeUndefined();
    });

    it('должен успешно устанавливать, изменять и читать переменные внутри runWithContext', () => {
      contextInstance.runWithContext(() => {
        expect(contextInstance.get('startTimestamp')).toBe(mockFields.startTimestamp);

        contextInstance.set('startTimestamp', 9999);
        expect(contextInstance.get('startTimestamp')).toBe(9999);

        contextInstance.setMultiple({ startTimestamp: 1111 } as any);
        expect(contextInstance.get('startTimestamp')).toBe(1111);

        const snapshot = contextInstance.extend();
        expect(snapshot.startTimestamp).toBe(1111);
      }, mockFields);
    });
  });

  describe('wrapWithTelemetry & Синхронизация цепочек трассировки', () => {
    it('Сценарий 1: Чистый запуск. Должен привязаться к глобальному bootstrap контексту процесса', () => {
      // Настраиваем мок так, чтобы он всегда возвращал пустой traceId (0000...)
      // для прохождения в ветку "else if" (разрыв контекста),
      // но при этом имел валидный родительский spanId для enrichedContext!
      (trace.getSpanContext as jest.Mock).mockReturnValue({
        traceId: '00000000000000000000000000000000',
        spanId: 'bootstrap-span-id',
      });

      contextInstance.runWithContext(() => {
        const traceId = contextInstance.get('traceId');
        const parentSpanId = contextInstance.get('parentSpanId');

        expect(traceId).toBe('mocked-otel-trace-id-32-chars-long');
        expect(parentSpanId).toBe('bootstrap-span-id'); // Тест гарантированно пройдет!
      }, mockFields);
    });

    it('Сценарий 2: Исключительная ситуация. Бизнес-код принудительно передал кастомный traceId', () => {
      (trace.getSpanContext as jest.Mock).mockReturnValue(undefined);
      const spySetSpanContext = jest.spyOn(trace, 'setSpanContext');
      mockFields.traceId = 'custom-business-trace-id-32-chars';

      contextInstance.runWithContext(() => {
        expect(contextInstance.get('traceId')).toBe('mocked-otel-trace-id-32-chars-long');
      }, mockFields);

      expect(spySetSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: mockFields.traceId,
          isRemote: true,
          traceFlags: TraceFlags.SAMPLED,
        }),
      );
    });

    it('Сценарий 3: Асинхронный запуск через runWithContextAsync с обработкой ошибок', async () => {
      (trace.getSpanContext as jest.Mock).mockReturnValue(undefined);
      const mockTracer = trace.getTracer('test');
      const activeSpan = mockTracer.startSpan('any');
      jest.spyOn(mockTracer, 'startSpan').mockReturnValue(activeSpan);

      const asyncTask = () => Promise.reject(new Error('Database Timeout'));

      await expect(contextInstance.runWithContextAsync(asyncTask, mockFields)).rejects.toThrow('Database Timeout');

      expect(activeSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Database Timeout',
      });
      expect(activeSpan.end).toHaveBeenCalled();
    });
  });

  describe('Статический декоратор @Define()', () => {
    it('должен успешно перехватывать вызов метода класса и выполнять его внутри изоляции', async () => {
      class MockBusinessService {
        @TestAsyncContext.define(() => ({ startTimestamp: 7777 }))
        public async executeOperation(input: string) {
          const currentTimestamp = TestAsyncContext.instance.get('startTimestamp');
          const currentTraceId = TestAsyncContext.instance.get('traceId');

          return {
            processed: true,
            input,
            currentTimestamp,
            currentTraceId,
          };
        }
      }

      const service = new MockBusinessService();
      const result = await service.executeOperation('hello-world');

      expect(result).toEqual({
        processed: true,
        input: 'hello-world',
        currentTimestamp: 7777,
        currentTraceId: 'mocked-otel-trace-id-32-chars-long',
      });
    });

    it('должен падать с понятным исключением, если статический инстанс класса не задан', async () => {
      class BrokenContext extends AbstractAsyncContext {
        // Разрываем наследование статического инстанса
        public static override instance = undefined as any;
        protected getTracerName() {
          return 'broken';
        }
      }

      const createAndRunFaultyService = async () => {
        class FaultyService {
          @BrokenContext.define()
          public doSomething() {
            return true;
          }
        }

        const service = new FaultyService();
        // КРИТИЧЕСКИ ВАЖНО: Вызываем метод, чтобы запустить выполнение wrappedMethod
        return service.doSomething();
      };

      await expect(createAndRunFaultyService()).rejects.toThrow('Не удалось перехватить контекст');
    });
  });
});

describe('Сквозная совместимость контекстов (Single Storage & Cross-Context Visibility)', () => {
  // 1. Создаем первый изолированный контекст (например, транспортный)
  interface IFirstContext extends IAsyncContext {
    transportKey: string;
    sharedTraceId: string;
  }
  class FirstTestContext extends AbstractAsyncContext<IFirstContext> {
    public static override instance = new FirstTestContext();
    protected getTracerName(): string {
      return 'first-test-tracer';
    }
  }

  // 2. Создаем второй изолированный контекст (например, прикладной бизнес-контекст)
  interface ISecondContext extends IAsyncContext {
    businessKey: string;
    sharedTraceId: string;
  }
  class SecondTestContext extends AbstractAsyncContext<ISecondContext> {
    public static override instance = new SecondTestContext();
    protected getTracerName(): string {
      return 'second-test-tracer';
    }
  }

  beforeEach(() => {
    // Явно инициализируем инстансы для работы статического метода define
    FirstTestContext.instance = new FirstTestContext();
    SecondTestContext.instance = new SecondTestContext();
  });

  it('должен обеспечивать сквозной get/set между разными классами контекстов за счет единого хранилища', async () => {
    const expectedTraceId = 'cross-context-trace-id-32-chars';
    const initialTransportFields = {
      sharedTraceId: expectedTraceId,
      transportKey: 'kafka-payload-data',
    };

    // Создаем тестовый сервис для симуляции сквозного вызова
    class MockCrossContextService {
      // Имитируем точку входа, которая разворачивает контекст через первый класс
      @FirstTestContext.define(() => initialTransportFields)
      public async handleIncomingExecution() {
        // ПРОВЕРКА 1: Второй контекст должен бесшовно прочитать traceId,
        // заинжекченный через первый контекст, так как AsyncLocalStorage — синглтон.
        const readTraceId = SecondTestContext.instance.get('sharedTraceId' as any);
        expect(readTraceId).toBe(expectedTraceId);

        // ПРОВЕРКА 2: Второй контекст выполняет мутацию (запись нового бизнес-ключа)
        SecondTestContext.instance.set('businessKey' as any, 'order-created-successfully');

        // ПРОВЕРКА 3: Первый контекст должен мгновенно увидеть изменения, внесенные вторым
        const readBusinessKeyFromFirst = FirstTestContext.instance.get('businessKey' as any);
        expect(readBusinessKeyFromFirst).toBe('order-created-successfully');

        // ПРОВЕРКА 4: Метод extend() второго контекста должен вернуть полный слепок данных,
        // включая поля, которые были записаны изначально через первый контекст
        const secondContextSnapshot: any = SecondTestContext.instance.extend();

        return {
          readTraceId,
          readBusinessKeyFromFirst,
          secondContextSnapshot,
        };
      }
    }

    const service = new MockCrossContextService();
    const result = await service.handleIncomingExecution();

    // Финальные утверждения (Assertions), гарантирующие безопасность атомарного хранилища:
    expect(result.secondContextSnapshot).toEqual(
      expect.objectContaining({
        sharedTraceId: expectedTraceId,
        transportKey: 'kafka-payload-data',
        businessKey: 'order-created-successfully',
      }),
    );
  });
});
