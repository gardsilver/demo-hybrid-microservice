/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { throwError } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, TraceSpanHelper } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';

jest.mock('src/modules/elk-logger', () => ({
  ...jest.requireActual('src/modules/elk-logger'),
  TraceSpanHelper: {
    generateRandomValue: jest.fn().mockReturnValue('mocked-message-uuid'),
  },
}));

jest.mock('src/modules/rabbit-mq/rabbit-mq-common', () => ({
  ...jest.requireActual('src/modules/rabbit-mq/rabbit-mq-common'),
  RabbitMqAsyncContext: {
    instance: {
      runWithContextAsync: jest.fn((cb) => cb()),
    },
    define: jest.fn(),
  },
}));

jest.mock('src/modules/rabbit-mq/rabbit-mq-server', () => {
  return {
    __esModule: true,
    EventRabbitMqMessage: (_topics: string[], _configFactory?: any) => {
      return (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor;
    },
    RabbitMqContext: jest.fn(),
  };
});

import { RabbitMqAsyncContext } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { HttpController } from './http.controller';
import { RabbitMqService } from '../services/rabbit-mq.service';

describe('HttpController (RabbitMQ Examples)', () => {
  let controller: HttpController;
  let mockRabbitMqService: jest.Mocked<RabbitMqService>;
  let mockLogger: IElkLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockLogger = new MockElkLoggerService();
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();

    mockRabbitMqService = {
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
          provide: RabbitMqService,
          useValue: mockRabbitMqService,
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
    const mockRequest = { query: 'rabbit-test' } as any;
    const mockContext = { traceId: 'abc', spanId: 'def' } as any;

    it('должен вернуть статус error, если сервис вернул false', async () => {
      mockRabbitMqService.search.mockResolvedValueOnce(false);

      const result = await controller.find(mockRequest, mockContext);

      expect(result).toEqual({ status: 'error' });
      expect(RabbitMqAsyncContext.instance.runWithContextAsync).toHaveBeenCalled();
      expect(mockRabbitMqService.search).toHaveBeenCalledWith(mockRequest);
    });

    it('должен успешно сгенерировать messageId, вызвать поиск и дождаться ответа из очереди', async () => {
      mockRabbitMqService.search.mockResolvedValueOnce(true);

      const mockResponseData = {
        properties: { messageId: 'mocked-message-uuid' },
        content: { data: { status: 'ok', items: [1, 2] } },
      };

      const searchResponseSpy = jest
        .spyOn(controller as any, 'searchResponse')
        .mockImplementationOnce(async () => mockResponseData as any);

      const result = await controller.find(mockRequest, mockContext);

      expect(TraceSpanHelper.generateRandomValue).toHaveBeenCalled();
      expect(searchResponseSpy).toHaveBeenCalledWith('mocked-message-uuid');
      expect(result).toEqual({ status: 'ok', items: [1, 2] });

      searchResponseSpy.mockRestore();
    });
  });

  describe('eachMessage', () => {
    it('должен логировать обработку входящего пакета и отправлять данные в поток responses', async () => {
      const mockData = { properties: { messageId: 'msg-1' }, content: {} } as any;
      const mockCtx = { getMessageOptions: jest.fn().mockReturnValue({ routingKey: 'find.response' }) } as any;

      const nextSpy = jest.spyOn((controller as any).responses, 'next');

      await controller.eachMessage(mockData, mockCtx);

      expect(mockLogger.info).toHaveBeenCalledWith('RMQ read message', expect.any(Object));
      expect(nextSpy).toHaveBeenCalledWith(mockData);
    });
  });

  describe('searchResponse (внутреннее RxJS ожидание)', () => {
    const targetMessageId = 'mocked-message-uuid';

    it('должен успешно zareзолвить промис, если сообщение содержит идентичный messageId', async () => {
      const validRmqMessage = { properties: { messageId: targetMessageId }, content: { data: { success: true } } };

      const promise = (controller as any).searchResponse(targetMessageId);

      (controller as any).responses.next(validRmqMessage);

      jest.advanceTimersByTime(0);

      const result = await promise;
      expect(result).toEqual(validRmqMessage);
      expect(mockLogger.info).toHaveBeenCalledWith('RMQ response success', expect.any(Object));
    });

    it('должен пропускать и игнорировать сообщения с несовпадающим messageId', async () => {
      const wrongRmqMessage = { properties: { messageId: 'some-other-uuid' }, content: {} };
      const validRmqMessage = { properties: { messageId: targetMessageId }, content: { data: { match: true } } };

      const promise = (controller as any).searchResponse(targetMessageId);

      (controller as any).responses.next(wrongRmqMessage);
      jest.advanceTimersByTime(0);

      (controller as any).responses.next(validRmqMessage);
      jest.advanceTimersByTime(0);

      const result = await promise;
      expect(result).toEqual(validRmqMessage);
    });

    it('должен отклонить промис и залогировать ошибку при срабатывании таймаута RxJS в 10 секунд', async () => {
      const timeoutErrorStream = throwError(() => new Error('Timeout has occurred'));
      jest.spyOn((controller as any).responses, 'pipe').mockReturnValueOnce(timeoutErrorStream);

      const promise = (controller as any).searchResponse(targetMessageId);

      jest.advanceTimersByTime(0);

      await expect(promise).rejects.toThrow('Timeout has occurred');
      expect(mockLogger.error).toHaveBeenCalledWith('RMQ response failed', expect.any(Object));
    });
  });
});
