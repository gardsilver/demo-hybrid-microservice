/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { trace, context as otelContext, SpanKind } from '@opentelemetry/api';
import { ExpressAdapter } from '@nestjs/platform-express';
import { GeneralAsyncContext } from 'src/modules/common/context';
import { HttpGeneralAsyncContextHeaderNames, HttHeadersHelper } from 'src/modules/http/http-common';
import { BaseHeadersHelper } from 'src/modules/common/helpers/base.headers.helper';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpOpentelemetryAdapter } from './http.opentelemetry.adapter';

jest.mock('src/modules/elk-logger', () => ({
  __esModule: true,
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('generated-mock-trace-id-11111'),
    generateSpanId: jest.fn().mockReturnValue('generated-mock-span-id-22222'),
  },
}));

describe('HttpOpentelemetryAdapter', () => {
  let adapter: HttpOpentelemetryAdapter;
  let mockExpressInstance: any;
  let middlewareFn: any;
  let mockTracer: any;
  let mockSpan: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan = {
      spanContext: jest.fn().mockReturnValue({
        traceId: 'mock-span-trace-id',
        spanId: 'mock-span-span-id',
      }),
      end: jest.fn(),
    };

    mockTracer = {
      startSpan: jest.fn().mockReturnValue(mockSpan),
    };

    jest.spyOn(trace, 'getTracer').mockReturnValue(mockTracer);
    jest.spyOn(trace, 'setSpanContext');
    jest.spyOn(trace, 'setSpan').mockImplementation((ctx: any, _span: any) => ctx);
    jest.spyOn(otelContext, 'with').mockImplementation((_ctx: any, fn: any) => fn());
    jest.spyOn(GeneralAsyncContext.instance, 'runWithContext').mockImplementation((fn: any) => fn());

    mockExpressInstance = {
      use: jest.fn().mockImplementation((fn) => {
        middlewareFn = fn;
      }),
    };

    jest.spyOn(ExpressAdapter.prototype, 'getInstance').mockReturnValue(mockExpressInstance);

    jest.spyOn(ExpressAdapter.prototype, 'reply').mockImplementation((_res: any, body: any, _status: any) => body);

    adapter = new HttpOpentelemetryAdapter();
  });

  it('должен успешно зарегистрировать перехватчик в сетевом контуре Express при инициализации', () => {
    expect(mockExpressInstance.use).toHaveBeenCalledTimes(1);
    expect(middlewareFn).toBeDefined();
  });

  it('Сценарий 1: Новый чистый HTTP-запрос (Без внешних заголовков трассировки)', () => {
    const mockReq: any = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/v1/users',
    };
    const mockRes: any = {};
    const mockNext = jest.fn();

    jest.spyOn(HttHeadersHelper, 'normalize').mockReturnValue({});
    jest.spyOn(BaseHeadersHelper, 'searchHeaderAsString').mockReturnValue(undefined);

    middlewareFn(mockReq, mockRes, mockNext);

    expect(TraceSpanHelper.generateTraceId).toHaveBeenCalled();
    expect(TraceSpanHelper.generateSpanId).toHaveBeenCalled();

    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      'HTTP SERVER: GET /api/v1/users',
      { kind: SpanKind.SERVER },
      expect.any(Object),
    );

    expect(trace.setSpan).toHaveBeenCalledWith(expect.any(Object), mockSpan);
    expect(GeneralAsyncContext.instance.runWithContext).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();

    const symbols = Object.getOwnPropertySymbols(mockRes);
    expect(symbols.length).toBe(1);
    expect(mockRes[symbols[0]]).toBe(mockSpan);
  });

  it('Сценарий 2: Сквозной распределенный HTTP-запрос (С внешними заголовками от Шлюза/Фронтенда)', () => {
    const incomingTraceId = 'f26019848606c5a0ddef6553fd304d4d';
    const incomingSpanId = '9bfaf418eaf3387a';

    const mockReq: any = {
      headers: {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: incomingTraceId,
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: incomingSpanId,
      },
      method: 'POST',
      url: '/api/app',
    };
    const mockRes: any = {};
    const mockNext = jest.fn();

    jest.spyOn(HttHeadersHelper, 'normalize').mockReturnValue(mockReq.headers);
    jest
      .spyOn(BaseHeadersHelper, 'searchHeaderAsString')
      .mockImplementation((headers: any, name: any) => headers[name]);

    middlewareFn(mockReq, mockRes, mockNext);

    expect(trace.setSpanContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        traceId: incomingTraceId,
        spanId: incomingSpanId,
        isRemote: true,
      }),
    );

    expect(mockTracer.startSpan).toHaveBeenCalledWith(
      'HTTP SERVER: POST /api/app',
      { kind: SpanKind.SERVER },
      expect.any(Object),
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('Сценарий 3: Завершение транзакции через метод reply — спан должен корректно закрыться и стереть ссылки', () => {
    const mockRes: any = {};
    const mockSymbol = Object.getOwnPropertySymbols(
      (() => {
        jest.spyOn(HttHeadersHelper, 'normalize').mockReturnValueOnce({});
        middlewareFn({ method: 'GET', url: '/' }, mockRes, () => {});
        return mockRes;
      })(),
    )[0];

    adapter.reply(mockRes, { status: 'ok' }, 200);

    expect(mockSpan.end).toHaveBeenCalledTimes(1);

    expect(mockRes[mockSymbol]).toBeUndefined();
  });

  it('Сценарий 4: Безопасный пропуск метода reply, если спан по этому символу отсутствует или уже был удален', () => {
    const mockRes: any = {};

    expect(() => {
      adapter.reply(mockRes, { data: 'test' }, 201);
    }).not.toThrow();

    expect(mockSpan.end).not.toHaveBeenCalled();
  });
});
