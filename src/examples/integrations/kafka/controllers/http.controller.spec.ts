/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { throwError } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, TraceSpanHelper } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';

jest.mock('src/modules/elk-logger', () => ({
  ...jest.requireActual('src/modules/elk-logger'),
  TraceSpanHelper: {
    generateRandomValue: jest.fn().mockReturnValue('mocked-correlation-uuid'),
  },
}));

jest.mock('src/modules/kafka/kafka-common', () => ({
  ...jest.requireActual('src/modules/kafka/kafka-common'),
  KafkaAsyncContext: {
    instance: {
      runWithContextAsync: jest.fn((cb) => cb()),
    },
    define: jest.fn(),
  },
}));

jest.mock('src/modules/kafka/kafka-server', () => {
  return {
    __esModule: true,
    EventKafkaMessage: (_topics: string[], _options?: any) => {
      return (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor;
    },
    ConsumerMode: {
      EACH_MESSAGE: 'EACH_MESSAGE',
    },
    ConsumerDeserializer: jest.fn().mockImplementation(() => ({})),
  };
});

import { KafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { HttpController } from './http.controller';
import { KafkaService } from '../services/kafka.service';

describe('HttpController', () => {
  let controller: HttpController;
  let mockKafkaService: jest.Mocked<KafkaService>;
  let mockLogger: IElkLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockLogger = new MockElkLoggerService();
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();

    mockKafkaService = {
      search: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HttpController],
      providers: [
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: jest.fn().mockReturnValue(mockLogger),
          },
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    controller = module.get<HttpController>(HttpController);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('должен быть определен', () => {
    expect(controller).toBeDefined();
  });

  describe('find', () => {
    const mockRequest = { query: 'test' } as any;
    const mockContext = { traceId: '123', spanId: '456' } as any;

    it('должен вернуть статус error, если сервис вернул false', async () => {
      mockKafkaService.search.mockResolvedValueOnce(false);

      const result = await controller.find(mockRequest, mockContext);

      expect(result).toEqual({ status: 'error' });
      expect(KafkaAsyncContext.instance.runWithContextAsync).toHaveBeenCalled();
      expect(mockKafkaService.search).toHaveBeenCalledWith(mockRequest);
    });

    it('должен успешно дождаться ответа Kafka и вернуть данные при совпадении correlationId', async () => {
      mockKafkaService.search.mockResolvedValueOnce(true);

      const mockResponseData = { value: { data: { status: 'success', id: 1 } }, key: 'mocked-correlation-uuid' };

      const searchResponseSpy = jest
        .spyOn(controller, 'searchResponse')
        .mockImplementationOnce(async () => mockResponseData as any);

      const result = await controller.find(mockRequest, mockContext);

      expect(result).toEqual({ status: 'success', id: 1 });
      expect(searchResponseSpy).toHaveBeenCalledWith('mocked-correlation-uuid');

      searchResponseSpy.mockRestore();
    });

    it('должен генерировать correlationId через TraceSpanHelper, если его нет в контексте', async () => {
      mockKafkaService.search.mockResolvedValueOnce(false);

      await controller.find(mockRequest, { traceId: '123', spanId: '456' } as any);

      expect(TraceSpanHelper.generateRandomValue).toHaveBeenCalled();
    });
  });

  describe('eachMessage', () => {
    it('должен логировать входящее сообщение и пушить его в поток responses', async () => {
      const mockData = { key: 'corr-1', value: {} } as any;
      const mockCtx = { getMessageOptions: jest.fn().mockReturnValue({ topic: 'DemoResponse' }) } as any;

      const nextSpy = jest.spyOn((controller as any).responses, 'next');

      await controller.eachMessage(mockData, mockCtx);

      expect(mockLogger.info).toHaveBeenCalledWith('Kafka read message', expect.any(Object));
      expect(nextSpy).toHaveBeenCalledWith(mockData);
    });
  });

  describe('searchResponse', () => {
    it('должен успешно разрешить Promise, если пришло сообщение с валидным key (correlationId)', async () => {
      const correlationId = 'valid-id';
      const mockKafkaMessage = { key: correlationId, value: { data: { ok: true } } };

      const promise = controller.searchResponse(correlationId);

      (controller as any).responses.next(mockKafkaMessage);

      jest.advanceTimersByTime(0);

      const result = await promise;
      expect(result).toEqual(mockKafkaMessage);
      expect(mockLogger.info).toHaveBeenCalledWith('Kafka response success', expect.any(Object));
    });

    it('должен игнорировать сообщения с чужим key (correlationId)', async () => {
      const correlationId = 'target-id';
      const wrongMessage = { key: 'wrong-id', value: {} };
      const rightMessage = { key: 'target-id', value: { data: { match: true } } };

      const promise = controller.searchResponse(correlationId);

      (controller as any).responses.next(wrongMessage);
      jest.advanceTimersByTime(0);

      (controller as any).responses.next(rightMessage);
      jest.advanceTimersByTime(0);

      const result = await promise;
      expect(result).toEqual(rightMessage);
    });

    it('должен падать по таймауту RxJS, если ответ не пришел за 10 секунд', async () => {
      const errorStream = throwError(() => new Error('Timeout has occurred'));
      jest.spyOn((controller as any).responses, 'pipe').mockReturnValueOnce(errorStream);

      const promise = controller.searchResponse('any-id');

      jest.advanceTimersByTime(0);

      await expect(promise).rejects.toThrow('Timeout has occurred');
      expect(mockLogger.error).toHaveBeenCalledWith('Kafka response failed', expect.any(Object));
    });
  });
});
