/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/unbound-method */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { INestElkLoggerService } from 'src/modules/elk-logger';
import { MockNestElkLoggerService } from 'tests/modules/elk-logger';

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  __esModule: true,
  getNodeAutoInstrumentations: jest.fn().mockReturnValue({}),
}));

jest.mock('@opentelemetry/instrumentation-nestjs-core', () => ({
  __esModule: true,
  NestInstrumentation: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/sdk-node', () => ({
  __esModule: true,
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@opentelemetry/sdk-trace-base', () => ({
  __esModule: true,
  AlwaysOffSampler: jest.fn().mockImplementation(() => ({})),
  BatchSpanProcessor: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  __esModule: true,
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

const mockConfigMethods = {
  getUrl: jest.fn().mockReturnValue('http://localhost:4318/v1/traces'),
  getApplicationName: jest.fn().mockReturnValue('test-app'),
  getMicroserviceName: jest.fn().mockReturnValue('test-service'),
  getMicroserviceVersion: jest.fn().mockReturnValue('1.0.0'),
  getDestroySignal: jest.fn().mockReturnValue('SIGTERM'),
  getBatchMaxQueueSize: jest.fn().mockReturnValue(2048),
  getBatchScheduledDelay: jest.fn().mockReturnValue(5000),
  getForcedDurationThreshold: jest.fn().mockReturnValue(1500),
  getIgnoredEndpoints: jest.fn().mockReturnValue([]),
  getIsEnabled: jest.fn().mockReturnValue(true),
};

jest.mock('../services/opentelemetry.config', () => {
  return {
    __esModule: true,
    OpentelemetryConfig: jest.fn().mockImplementation(() => mockConfigMethods),
  };
});

jest.mock('../propagators/propagator', () => ({
  __esModule: true,
  Propagator: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../exporters/contextual-tail-sampling.exporter', () => ({
  __esModule: true,
  ContextualTailSamplingExporter: jest.fn().mockImplementation(() => ({})),
}));

import { OpentelemetryBuilder } from './opentelemetry.builder';

describe('OpentelemetryBuilder', () => {
  let mockConfigService: ConfigService;
  let mockLogger: INestElkLoggerService;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    (OpentelemetryBuilder as any).otelSDK = undefined;
    (OpentelemetryBuilder as any).logger = undefined;
    (OpentelemetryBuilder as any).hartShutdown = true;

    mockConfigService = new MockConfigService() as unknown as ConfigService;
    mockLogger = new MockNestElkLoggerService();
    mockLogger.log = jest.fn();
    mockLogger.error = jest.fn();

    processOnSpy = jest.spyOn(process, 'on').mockImplementation((_event, _cb) => process);
    mockConfigMethods.getIsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    processOnSpy.mockRestore();
  });

  describe('build', () => {
    it('должен переключить приватный статический флаг hartShutdown в положение false', () => {
      expect((OpentelemetryBuilder as any).hartShutdown).toBe(true);

      OpentelemetryBuilder.notUseHardShutdown();

      expect((OpentelemetryBuilder as any).hartShutdown).toBe(false);
    });

    it('должен успешно инициализировать и запустить NodeSDK при первом вызове', () => {
      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      expect(NodeSDK).toHaveBeenCalledTimes(1);
      const mockSdkInstance = (NodeSDK as jest.Mock).mock.results[0].value;
      expect(mockSdkInstance.start).toHaveBeenCalledTimes(1);
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    it('должен мгновенно прервать выполнение (return), если otelSDK уже существует', () => {
      const fakeSdkInstance = { start: jest.fn(), shutdown: jest.fn() };

      (OpentelemetryBuilder as any).otelSDK = fakeSdkInstance;

      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      expect(NodeSDK).not.toHaveBeenCalled();
      expect(fakeSdkInstance.start).not.toHaveBeenCalled();
    });

    it('должен инициализировать SDK с AlwaysOffSampler, если подсистема отключена по конфигу', () => {
      mockConfigMethods.getIsEnabled.mockReturnValue(false);

      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      expect(NodeSDK).toHaveBeenCalledTimes(1);
      const mockSdkInstance = (NodeSDK as jest.Mock).mock.results[0].value;
      expect(mockSdkInstance.start).toHaveBeenCalledTimes(1);
    });

    it('должен корректно реагировать на системный сигнал и вызывать shutdown, если hartShutdown = true', async () => {
      let registeredCallback: Function = () => {};
      processOnSpy.mockImplementation((event, cb) => {
        if (event === 'SIGTERM') {
          registeredCallback = cb;
        }
        return process;
      });

      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      const mockSdkInstance = (NodeSDK as jest.Mock).mock.results[0].value;
      const shutdownSpy = jest.spyOn(OpentelemetryBuilder, 'shutdown');

      await registeredCallback();

      expect(shutdownSpy).toHaveBeenCalledTimes(1);
      expect(mockSdkInstance.shutdown).toHaveBeenCalledTimes(1);

      shutdownSpy.mockRestore();
    });

    it('НЕ должен вызывать метод shutdown по системному сигналу, если активирован notUseHardShutdown()', async () => {
      let registeredCallback: Function = () => {};
      processOnSpy.mockImplementation((event, cb) => {
        if (event === 'SIGTERM') {
          registeredCallback = cb;
        }
        return process;
      });

      OpentelemetryBuilder.notUseHardShutdown();
      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      const shutdownSpy = jest.spyOn(OpentelemetryBuilder, 'shutdown');

      await registeredCallback();

      expect(shutdownSpy).not.toHaveBeenCalled();
      shutdownSpy.mockRestore();
    });
  });

  describe('shutdown', () => {
    it('должен логировать успешное завершение работы SDK при резолве промиса', async () => {
      const mockSdk = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      (OpentelemetryBuilder as any).otelSDK = mockSdk;
      (OpentelemetryBuilder as any).logger = mockLogger;

      await OpentelemetryBuilder.shutdown();

      expect(mockSdk.shutdown).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('OpenTelemetry: SDK shut down successfully'));
    });

    it('должен выводить ошибку в логгер, если метод shutdown завершился реджектом', async () => {
      const mockError = new Error('OTel native crash');
      const mockSdk = {
        shutdown: jest.fn().mockRejectedValue(mockError),
      };
      (OpentelemetryBuilder as any).otelSDK = mockSdk;
      (OpentelemetryBuilder as any).logger = mockLogger;

      await OpentelemetryBuilder.shutdown();

      expect(mockSdk.shutdown).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('OpenTelemetry: Error shutting down SDK'),
        mockError,
      );
    });

    it('должен мгновенно завершиться без действий, если otelSDK не был инициализирован', async () => {
      const result = await OpentelemetryBuilder.shutdown();
      expect(result).toBeUndefined();
    });
  });
});
