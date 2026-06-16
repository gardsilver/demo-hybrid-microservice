/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { trace, SpanStatusCode } from '@opentelemetry/api';

jest.mock('src/modules/elk-logger/services/process-trace-span.store', () => {
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

    mockFields = {
      traceId: undefined,
      spanId: undefined,
      parentSpanId: undefined,
      startTimestamp: faker.number.int(),
    } as any;
  });

  describe('Базовые методы AsyncLocalStorage', () => {
    it('должен выбрасывать EmptyAsyncContextError при обращении к пустому хранилищу', () => {
      expect(() => contextInstance.get('startTimestamp')).toThrow(EmptyAsyncContextError);
    });

    it('должен безопасно возвращать undefined через getSafe, если контекст не запущен', () => {
      expect(contextInstance.getSafe('startTimestamp')).toBeUndefined();
    });

    it('должен успешно мутировать и читать переменные внутри runWithContext', () => {
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

    it('должен возвращать пустой объект через extend при ошибке хранилища', () => {
      expect(contextInstance.extend()).toEqual({});
    });
  });

  describe('wrapWithTelemetry (Ветвления OpenTelemetry)', () => {
    it('Сценарий 1: Нативный контекст активен (hasValidActiveOtelContext === true)', () => {
      // Имитируем живой входящий HTTP/Kafka трейс
      (trace.getSpanContext as jest.Mock).mockReturnValue({
        traceId: 'active-http-trace-id-32-chars-long',
        spanId: 'active-http-span-id',
      });

      contextInstance.runWithContext(() => {
        expect(contextInstance.get('traceId')).toBe('mocked-otel-trace-id-32-chars-long');
        expect(contextInstance.get('parentSpanId')).toBe('active-http-span-id');
      }, mockFields);

      expect(trace.setSpanContext).not.toHaveBeenCalled(); // Спан создан нативно без оверрайда
    });

    it('Сценарий 2: Передан кастомный traceId вручную при пустом нативном контексте', () => {
      (trace.getSpanContext as jest.Mock).mockReturnValue(undefined);
      const spySetSpanContext = jest.spyOn(trace, 'setSpanContext');
      mockFields.traceId = 'custom-business-trace-id-32-chars';
      mockFields.parentSpanId = 'custom-parent-id';

      contextInstance.runWithContext(() => {
        expect(contextInstance.get('traceId')).toBe('mocked-otel-trace-id-32-chars-long');
      }, mockFields);

      expect(spySetSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: mockFields.traceId,
          spanId: mockFields.parentSpanId,
          isRemote: true, // Ручной проброс помечается как Remote
        }),
      );
    });

    it('Сценарий 3: Полный разрыв контекста — фолбек на дерево bootstrap', () => {
      // Нативный контекст пуст (нулевой traceId)
      (trace.getSpanContext as jest.Mock).mockReturnValue({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
      });
      const spySetSpanContext = jest.spyOn(trace, 'setSpanContext');

      contextInstance.runWithContext(() => {
        expect(contextInstance.get('traceId')).toBe('mocked-otel-trace-id-32-chars-long');
      }, mockFields);

      expect(spySetSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: 'bootstrap-trace-id-32-chars-long',
          spanId: 'bootstrap-span-id',
          isRemote: false, // Локальный bootstrap
        }),
      );
    });
  });

  describe('executeAndLifecycleSpan (Жизненный цикл спанов и Промисы)', () => {
    it('должен успешно закрывать спан со статусом OK для синхронных методов', () => {
      const mockTracer = trace.getTracer('test');
      const mockSpan = mockTracer.startSpan('any');
      jest.spyOn(mockTracer, 'startSpan').mockReturnValue(mockSpan);

      contextInstance.runWithContext(() => 'sync-result', mockFields);

      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('должен успешно обрабатывать асинхронный Promise и проставлять OK', async () => {
      const mockTracer = trace.getTracer('test');
      const mockSpan = mockTracer.startSpan('any');
      jest.spyOn(mockTracer, 'startSpan').mockReturnValue(mockSpan);

      const result = await contextInstance.runWithContextAsync(async () => 'async-res', mockFields);

      expect(result).toBe('async-res');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('должен перехватывать ошибки асинхронных методов, логировать в спан и закрывать его', async () => {
      const mockTracer = trace.getTracer('test');
      const mockSpan = mockTracer.startSpan('any');
      jest.spyOn(mockTracer, 'startSpan').mockReturnValue(mockSpan);

      await expect(
        contextInstance.runWithContextAsync(() => Promise.reject(new Error('Async Failure')), mockFields),
      ).rejects.toThrow('Async Failure');

      expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Async Failure',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('должен перехватывать ошибки синхронных вызовов', () => {
      const mockTracer = trace.getTracer('test');
      const mockSpan = mockTracer.startSpan('any');
      jest.spyOn(mockTracer, 'startSpan').mockReturnValue(mockSpan);

      expect(() => {
        contextInstance.runWithContext(() => {
          throw new Error('Sync Failure');
        }, mockFields);
      }).toThrow('Sync Failure');

      expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Sync Failure',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('Декоратор @Define()', () => {
    it('должен успешно выполнять оборачиваемый метод внутри контекста', async () => {
      class MockService {
        @TestAsyncContext.define(() => ({ startTimestamp: 5555 }))
        public async handle(data: string) {
          const startTimestamp = TestAsyncContext.instance.get('startTimestamp');
          return { data, startTimestamp };
        }
      }

      const service = new MockService();
      const res = await service.handle('test-payload');

      expect(res).toEqual({
        data: 'test-payload',
        startTimestamp: 5555,
      });
    });

    it('должен падать с ошибкой, если статический инстанс контекста равен undefined', async () => {
      class BrokenContext extends AbstractAsyncContext {
        public static override instance = undefined as any;
        protected getTracerName() {
          return 'broken';
        }
      }

      const runBrokenService = async () => {
        class BrokenService {
          @BrokenContext.define()
          public doSomething() {
            return true;
          }
        }
        const service = new BrokenService();
        return service.doSomething();
      };

      await expect(runBrokenService()).rejects.toThrow('Не удалось перехватить контекст');
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
