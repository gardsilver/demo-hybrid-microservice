/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import { INestElkLoggerService } from 'src/modules/elk-logger';
import { OpentelemetryConfig } from '../services/opentelemetry.config';
import { ContextualTailSamplingExporter } from './contextual-tail-sampling.exporter';

describe('ContextualTailSamplingExporter', () => {
  let exporter: ContextualTailSamplingExporter;
  let mockDownstreamExporter: jest.Mocked<SpanExporter>;
  let mockConfig: jest.Mocked<OpentelemetryConfig>;
  let mockLogger: jest.Mocked<INestElkLoggerService>;
  let mockCallback: jest.Mock;

  const baseSeconds = 1781700000;
  const zeroNano = 0;
  const fiftyMillionNano = 50000000;
  const oneHundredMillionNano = 100000000;
  const fourHundredMillionNano = 400000000;
  const fiveHundredMillionNano = 500000000;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDownstreamExporter = {
      export: jest.fn().mockImplementation((spans, cb) => cb({ code: ExportResultCode.SUCCESS })),
      shutdown: jest.fn().mockResolvedValue(undefined),
      forceFlush: jest.fn().mockResolvedValue(undefined),
    };

    mockConfig = {
      getIgnoredEndpoints: jest.fn().mockReturnValue(['/health', '/metrics']),
      getForcedDurationThreshold: jest.fn().mockReturnValue(1500),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockCallback = jest.fn();

    exporter = new ContextualTailSamplingExporter(mockDownstreamExporter, mockConfig, mockLogger);
  });

  function createMockSpan(params: {
    traceId: string;
    spanId: string;
    name: string;
    startTime: [number, number];
    endTime: [number, number];
    code?: SpanStatusCode;
  }): ReadableSpan {
    return {
      name: params.name,
      startTime: params.startTime as any,
      endTime: params.endTime as any,
      status: { code: params.code ?? SpanStatusCode.UNSET },
      spanContext: () => ({
        traceId: params.traceId,
        spanId: params.spanId,
        traceFlags: 1,
      }),
    } as unknown as ReadableSpan;
  }

  it('должен мгновенно вернуть SUCCESS, если на вход передан пустой массив спанов', () => {
    exporter.export([], mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
    expect(mockDownstreamExporter.export).not.toHaveBeenCalled();
  });

  it('Сценарий 1: Должен полностью отбросить трейс (DROPPED), если хотя бы один спан попал под Ignore-лист', () => {
    const traceId = 'trace-ignore-111';

    const span1 = createMockSpan({
      traceId,
      spanId: 's1',
      name: 'HTTP GET /api/users',
      startTime: [baseSeconds, zeroNano],
      endTime: [baseSeconds, fiftyMillionNano],
    });

    const span2 = createMockSpan({
      traceId,
      spanId: 's2',
      name: 'middleware - /health/check',
      startTime: [baseSeconds, zeroNano],
      endTime: [baseSeconds, fiftyMillionNano],
    });

    exporter.export([span1, span2], mockCallback);

    expect(mockDownstreamExporter.export).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`[OTel Tail-Exporter] DROPPED by Ignore-List: Trace [${traceId}]`),
    );
  });

  it('Сценарий 2: Должен форвардить трейс (FORWARDING), если длительность пачки превысила forcedThreshold (SLA лаг)', () => {
    const traceId = 'trace-lag-222';

    // Интервал: от 0 секунд до 2 секунд и 500мс (итого 2500мс, что больше лимита 1500мс)
    const span1 = createMockSpan({
      traceId,
      spanId: 's1',
      name: 'HTTP POST /api/payment',
      startTime: [baseSeconds, zeroNano],
      endTime: [baseSeconds + 2, fiveHundredMillionNano], // ИСПРАВЛЕНО: Убрана неизвестная переменная!
    });

    exporter.export([span1], mockCallback);

    expect(mockDownstreamExporter.export).toHaveBeenCalledWith([span1], mockCallback);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`[OTel Tail-Exporter] FORWARDING Trace [${traceId}]`),
    );
  });

  it('Сценарий 3: Должен форвардить трейс (FORWARDING), если внутри пачки зафиксирован статус ошибки SpanStatusCode.ERROR', () => {
    const traceId = 'trace-error-333';

    const span1 = createMockSpan({
      traceId,
      spanId: 's1',
      name: 'gRPC MainService/find',
      startTime: [baseSeconds, zeroNano],
      endTime: [baseSeconds, oneHundredMillionNano],
      code: SpanStatusCode.ERROR,
    });

    exporter.export([span1], mockCallback);

    expect(mockDownstreamExporter.export).toHaveBeenCalledWith([span1], mockCallback);
  });

  it('Сценарий 4: Должен молча удалить трейс (DROPPED), если транзакция успешна и уложилась в лимиты SLA', () => {
    const traceId = 'trace-success-444';

    const span1 = createMockSpan({
      traceId,
      spanId: 's1',
      name: 'HTTP GET /api/app',
      startTime: [baseSeconds, zeroNano],
      endTime: [baseSeconds, fourHundredMillionNano],
      code: SpanStatusCode.OK,
    });

    exporter.export([span1], mockCallback);

    expect(mockDownstreamExporter.export).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`[OTel Tail-Exporter] DROPPED Successful Trace [${traceId}]`),
    );
  });

  it('должен прозрачно проксировать вызовы деструктуризации shutdown и forceFlush на нижележащий экспортер', async () => {
    await exporter.shutdown();
    expect(mockDownstreamExporter.shutdown).toHaveBeenCalledTimes(1);

    await exporter.forceFlush();
    expect(mockDownstreamExporter.forceFlush).toHaveBeenCalledTimes(1);
  });

  it('должен безопасно завершиться при вызове forceFlush, если у downstreamExporter отсутствует метод forceFlush', async () => {
    const minimalistExporter: SpanExporter = {
      export: jest.fn(),
      shutdown: jest.fn(),
    };

    const simpleExporter = new ContextualTailSamplingExporter(minimalistExporter, mockConfig, mockLogger);

    await expect(simpleExporter.forceFlush()).resolves.not.toThrow();
  });
});
