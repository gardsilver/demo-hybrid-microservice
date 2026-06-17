/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import {
  Context,
  TextMapGetter,
  TextMapSetter,
  trace,
  TraceFlags,
  ROOT_CONTEXT,
  SpanContext,
} from '@opentelemetry/api';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { Propagator } from './propagator';

jest.mock('@opentelemetry/api', () => {
  const original = jest.requireActual('@opentelemetry/api');
  return {
    ...original,
    trace: {
      getSpanContext: jest.fn(),
      setSpanContext: jest.fn((ctx, spanCtx) => ({ ...ctx, __spanContext: spanCtx })),
    },
  };
});

describe('Propagator', () => {
  let propagator: Propagator;
  let mockContext: Context;

  let mockTraceId: string | undefined;
  let mockSpanId: string | undefined;

  beforeEach(() => {
    mockTraceId = TraceSpanHelper.generateTraceId();
    mockSpanId = TraceSpanHelper.generateSpanId();

    propagator = new Propagator();
    mockContext = ROOT_CONTEXT;
    jest.clearAllMocks();
  });

  describe('PropagatorBuilder', () => {
    it('должен создавать экземпляр пропагатора с методом fields', () => {
      expect(propagator).toBeDefined();
      expect(propagator.fields()).toEqual([
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
      ]);
    });
  });

  describe('extract', () => {
    let mockGetter: TextMapGetter;

    beforeEach(() => {
      mockGetter = {
        get: jest.fn((carrier: any, key: string) => carrier?.[key]),
        keys: jest.fn((carrier: any) => Object.keys(carrier || {})),
      };
    });

    it('должен вернуть исходный контекст, если отсутствует traceId или spanId', () => {
      (mockGetter.get as jest.Mock).mockImplementation((_carrier, key) => {
        if (key === HttpGeneralAsyncContextHeaderNames.TRACE_ID) return mockTraceId;
        return undefined;
      });

      const resultContext = propagator.extract(mockContext, {}, mockGetter);

      expect(resultContext).toBe(mockContext);
    });

    it('Сценарий "Внешний запрос" (isRemote: true): должен извлечь, нормализовать ID и пометить как Remote, если текущий контекст пуст', () => {
      (trace.getSpanContext as jest.Mock).mockReturnValue(undefined);

      const carrier = {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: '943BD5C6-8F46-F94E-C9E9-2020FEF02186',
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: 'DB6763CFD69947AE',
      };

      propagator.extract(mockContext, carrier, mockGetter);

      expect(trace.setSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: '943bd5c68f46f94ec9e92020fef02186',
          spanId: 'db6763cfd69947ae',
          traceFlags: TraceFlags.SAMPLED,
          isRemote: true,
        }),
      );
    });

    it('Сценарий "Loopback-вызов" (isRemote: false): должен выставить false, если извлекаемый traceId совпадает с уже активным в Node.js', () => {
      const targetTraceId = '7f5d75cad54d997c991e549b32097d25';

      (trace.getSpanContext as jest.Mock).mockReturnValue({
        traceId: targetTraceId,
        spanId: 'any-active-local-span',
      });

      const carrier = {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: targetTraceId,
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: 'bc6171317f45d53e',
      };

      propagator.extract(mockContext, carrier, mockGetter);

      expect(trace.setSpanContext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          traceId: targetTraceId,
          spanId: 'bc6171317f45d53e',
          isRemote: false,
        }),
      );
    });

    it('должен корректно нормализовать, дополнить нулями и установить валидный SpanContext', () => {
      // Имитируем грязные входящие заголовки (разный регистр, не-hex символы, неверная длина)
      const rawTraceId = 'G1a2b3c4-D5e6-F7a8-b9c0-1234567890ab'; // содержит дефисы и 'G' (не hex)
      const rawSpanId = 'XYZ-1a2b3c'; // содержит 'XYZ' и дефис

      // 'G', 'X', 'Y', 'Z' и дефисы должны удалиться. Остальное преобразуется в нижний регистр.
      // Ожидаемый чистый hex traceId: '1a2b3c4d5e6f7a8b9c01234567890ab' (31 символ -> padStart добавит один '0' слева)
      const expectedTraceId = '01a2b3c4d5e6f7a8b9c01234567890ab';
      // Ожидаемый чистый hex spanId: '1a2b3c' (6 символов -> padStart добавит десять '0' слева)
      const expectedSpanId = '00000000001a2b3c';

      (mockGetter.get as jest.Mock).mockImplementation((_carrier, key) => {
        if (key === HttpGeneralAsyncContextHeaderNames.TRACE_ID) return rawTraceId;
        if (key === HttpGeneralAsyncContextHeaderNames.SPAN_ID) return rawSpanId;
        return undefined;
      });

      const setSpanContextSpy = jest.spyOn(trace, 'setSpanContext');

      propagator.extract(mockContext, {}, mockGetter);

      expect(setSpanContextSpy).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          traceId: expectedTraceId,
          spanId: expectedSpanId,
          traceFlags: TraceFlags.SAMPLED,
          isRemote: true,
        }),
      );
    });
  });

  describe('inject', () => {
    let mockSetter: TextMapSetter;
    let validSpanContext: SpanContext;

    beforeEach(() => {
      mockSetter = {
        set: jest.fn(),
      };
      validSpanContext = {
        traceId: mockTraceId,
        spanId: mockSpanId,
        traceFlags: TraceFlags.SAMPLED,
      } as SpanContext;
    });

    it('должен прервать выполнение, если в контексте отсутствует валидный SpanContext', () => {
      jest.spyOn(trace, 'getSpanContext').mockReturnValue(undefined);
      const carrier = {};

      propagator.inject(mockContext, carrier, mockSetter);

      expect(mockSetter.set).toHaveBeenCalledTimes(0);
    });

    it('должен записать ID в пустой carrier, если заголовки еще не были установлены', () => {
      jest.spyOn(trace, 'getSpanContext').mockReturnValue(validSpanContext as any);
      const carrier: Record<string, string> = {};

      propagator.inject(mockContext, carrier, mockSetter);

      expect(mockSetter.set).toHaveBeenCalledWith(
        carrier,
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        validSpanContext.traceId,
      );
      expect(mockSetter.set).toHaveBeenCalledWith(
        carrier,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        validSpanContext.spanId,
      );
    });

    it('НЕ должен перезаписывать заголовки, если они уже были установлены бизнес-кодом (HttpHeadersBuilder)', () => {
      jest.spyOn(trace, 'getSpanContext').mockReturnValue(validSpanContext as any);

      const carrier = {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: 'custom-business-trace-id',
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: 'custom-business-span-id',
      };

      propagator.inject(mockContext, carrier, mockSetter);

      expect(mockSetter.set).not.toHaveBeenCalled();
    });

    it('должен записать только отсутствующий заголовок, если заполнен частично', () => {
      jest.spyOn(trace, 'getSpanContext').mockReturnValue(validSpanContext as any);

      const carrier = {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: 'custom-business-trace-id',
      };

      propagator.inject(mockContext, carrier, mockSetter);

      expect(mockSetter.set).not.toHaveBeenCalledWith(
        carrier,
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        expect.any(String),
      );

      expect(mockSetter.set).toHaveBeenCalledWith(
        carrier,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        validSpanContext.spanId,
      );
    });
  });
});
