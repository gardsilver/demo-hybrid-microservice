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
import { PropagatorBuilder } from './propagator.builder';

describe('Propagator', () => {
  let propagator: any;
  let mockContext: Context;

  let mockTraceId: string | undefined;
  let mockSpanId: string | undefined;

  beforeEach(() => {
    mockTraceId = TraceSpanHelper.generateTraceId();
    mockSpanId = TraceSpanHelper.generateSpanId();

    propagator = PropagatorBuilder.build();
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
        get: jest.fn(),
        keys: jest.fn(),
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
