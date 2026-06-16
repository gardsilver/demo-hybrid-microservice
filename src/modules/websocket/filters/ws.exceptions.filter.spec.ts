/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { ArgumentsHost } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { LoggerMarkers } from 'src/modules/common';
import { WsHelper } from '../helpers/ws.helper';
import { WsErrorResponseFilter } from './ws.exceptions.filter';
import { WsResponseHandler } from './ws.response.handler';

// 1. Мокаем активный спан OpenTelemetry
const mockSpan = {
  recordException: jest.fn(),
  setStatus: jest.fn(),
};

jest.mock('@opentelemetry/api', () => {
  const original = jest.requireActual('@opentelemetry/api');
  return {
    ...original,
    trace: {
      ...original.trace,
      getActiveSpan: jest.fn().mockImplementation(() => mockSpan),
    },
  };
});

describe('WsErrorResponseFilter', () => {
  let filter: WsErrorResponseFilter;
  let mockResponseHandler: jest.Mocked<WsResponseHandler>;
  let mockContext: jest.Mocked<ArgumentsHost>;
  let mockSocketClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpan.recordException.mockClear();
    mockSpan.setStatus.mockClear();

    // Мокаем инфраструктурный HttpResponseHandler-аналог для вебсокетов
    mockResponseHandler = {
      handleError: jest.fn().mockImplementation((_ctx, _err) => {
        return new WsException('Mapped WebSocket Error Message');
      }),
    } as unknown as jest.Mocked<WsResponseHandler>;

    filter = new WsErrorResponseFilter(mockResponseHandler);

    // Мокаем нативный клиент socket.io
    mockSocketClient = {
      id: 'ws-test-client-id-999',
      emit: jest.fn(),
    };

    // Настраиваем базовую заглушку NestJS ArgumentsHost
    mockContext = {
      getType: jest.fn().mockReturnValue('ws'),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockSocketClient),
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;

    // Заглушаем хелпер проверки транспорта, по умолчанию выставляем true
    jest.spyOn(WsHelper, 'isWs').mockReturnValue(true);
  });

  it('должен прозрачно выйти из метода (return), если WsHelper определил транспорт как не-WebSocket', () => {
    // Симулируем, что сбой произошел, например, на HTTP-слое
    jest.spyOn(WsHelper, 'isWs').mockReturnValueOnce(false);
    const mockException = new Error('Some HTTP Network Error');

    filter.catch(mockException, mockContext);

    // Проверяем работу защитного блока if (!WsHelper.isWs(host)) { return; }
    expect(mockResponseHandler.handleError).not.toHaveBeenCalled();
    expect(mockSocketClient.emit).not.toHaveBeenCalled();
    expect(trace.getActiveSpan).not.toHaveBeenCalled(); // Метод не должен дергать спаны
  });

  it('должен успешно прогнать исключение через конвейер обработки и обогатить спан OpenTelemetry', () => {
    const mockRawException = new Error('Database Unique Constraint Violation');

    filter.catch(mockRawException, mockContext);

    // 1. Проверяем, что фильтр делегировал сборку логов хэндлеру с правильным модулем и маркерами
    expect(mockResponseHandler.handleError).toHaveBeenCalledWith(mockContext, mockRawException, {
      module: 'WsErrorResponseFilter.catch',
      markers: [LoggerMarkers.INTERNAL],
    });

    // 2. Проверяем, что активный спан Jaeger перехвачен и покрашен в ERROR
    expect(trace.getActiveSpan).toHaveBeenCalled();
    expect(mockSpan.recordException).toHaveBeenCalledWith(mockRawException);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Mapped WebSocket Error Message', // Берется сообщение от resolvedError
    });

    // 3. Проверяем, что клиенту сокета улетело детерминированное событие 'exception'
    expect(mockSocketClient.emit).toHaveBeenCalledWith('exception', {
      status: 'error',
      message: 'Mapped WebSocket Error Message',
    });
  });

  it('должен корректно покрасить спан кастомной ошибкой, если активный спан присутствует, но exception не является инстансом Error', () => {
    const mockStringException = 'Raw string panic inside gateway';

    // Переопределяем поведение хэндлера, чтобы он вернул ошибку на основе строки
    mockResponseHandler.handleError.mockReturnValueOnce(new WsException('Raw string panic inside gateway'));

    filter.catch(mockStringException, mockContext);

    // Так как прилетела строка, recordException должен получить инстанс Error с этим текстом
    expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Raw string panic inside gateway',
    });

    expect(mockSocketClient.emit).toHaveBeenCalledWith('exception', {
      status: 'error',
      message: 'Raw string panic inside gateway',
    });
  });

  it('должен успешно отправить событие клиенту и записать логи, даже если активный спан OpenTelemetry отсутствует (activeSpan === undefined)', () => {
    // Симулируем отсутствие активного трассировочного контекста
    (trace.getActiveSpan as jest.Mock).mockReturnValueOnce(undefined);
    const mockException = new Error('Isolated WebSocket crash');

    filter.catch(mockException, mockContext);

    // Логирование и отправка должны отработать штатно, несмотря на отсутствие OTel
    expect(mockResponseHandler.handleError).toHaveBeenCalled();
    expect(mockSocketClient.emit).toHaveBeenCalledWith('exception', {
      status: 'error',
      message: 'Mapped WebSocket Error Message',
    });

    // Вызовы на покраску спана не должны производиться во избежание TypeError
    expect(mockSpan.setStatus).not.toHaveBeenCalled();
  });
});
