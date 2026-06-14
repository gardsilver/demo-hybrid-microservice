/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/unbound-method */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { INestElkLoggerService } from 'src/modules/elk-logger';
import { MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { OpentelemetryBuilder } from './opentelemetry.builder';

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  ...jest.requireActual('@opentelemetry/auto-instrumentations-node'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_AUTO_INSTRUMENTATIONS_NODE_MOCK,
}));

jest.mock('@opentelemetry/instrumentation-nestjs-core', () => ({
  ...jest.requireActual('@opentelemetry/instrumentation-nestjs-core'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_INSTRUMENTATIONS_NESTJS_CORE_MOCK,
}));

jest.mock('@opentelemetry/sdk-node', () => ({
  ...jest.requireActual('@opentelemetry/sdk-node'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_SDK_NODE_MOCK,
}));

jest.mock('../services/opentelemetry.config', () => {
  return {
    OpentelemetryConfig: jest.fn().mockImplementation(() => ({
      getUrl: jest.fn().mockReturnValue('http://localhost:4318/v1/traces'),
      getApplicationName: jest.fn().mockReturnValue('test-app'),
      getMicroserviceName: jest.fn().mockReturnValue('test-service'),
      getMicroserviceVersion: jest.fn().mockReturnValue('1.0.0'),
      getDestroySignal: jest.fn().mockReturnValue('SIGTERM'),
    })),
  };
});

jest.mock('./propagator.builder', () => ({
  PropagatorBuilder: {
    build: jest.fn().mockReturnValue({}),
  },
}));

describe('OpentelemetryBuilder', () => {
  let mockConfigService: ConfigService;
  let mockLogger: INestElkLoggerService;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Сбрасываем приватные статические свойства класса через рефлексию/as any для изоляции тестов
    (OpentelemetryBuilder as any).otelSDK = undefined;
    (OpentelemetryBuilder as any).logger = undefined;
    (OpentelemetryBuilder as any).hartShutdown = true;

    mockConfigService = new MockConfigService() as unknown as ConfigService;

    mockLogger = new MockNestElkLoggerService();
    mockLogger.log = jest.fn();
    mockLogger.error = jest.fn();

    processOnSpy = jest.spyOn(process, 'on').mockImplementation((_event, _cb) => process);
  });

  afterEach(() => {
    processOnSpy.mockRestore();
  });

  describe('build', () => {
    it('должен успешно инициализировать и запустить NodeSDK при первом вызове', () => {
      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      // Проверяем создание NodeSDK и вызов метода start()
      expect(NodeSDK).toHaveBeenCalledTimes(1);
      const mockSdkInstance = (NodeSDK as jest.Mock).mock.results[0].value;
      expect(mockSdkInstance.start).toHaveBeenCalledTimes(1);

      // Проверяем, что была подписка на системный сигнал завершения (SIGTERM)
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    it('НЕ должен инициализировать NodeSDK повторно, если он уже запущен (синглтон)', () => {
      // Первый вызов
      OpentelemetryBuilder.build(mockConfigService, mockLogger);
      // Второй вызов
      OpentelemetryBuilder.build(mockConfigService, mockLogger);

      // Конструктор NodeSDK должен быть вызван строго один раз
      expect(NodeSDK).toHaveBeenCalledTimes(1);
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

      // Имитируем триггер системного сигнала SIGTERM от NodeJS
      await registeredCallback();

      expect(shutdownSpy).toHaveBeenCalledTimes(1);
      expect(mockSdkInstance.shutdown).toHaveBeenCalledTimes(1);

      shutdownSpy.mockRestore();
    });

    it('НЕ должен вызывать метод shutdown по системному сигналу, если был вызван метод notUseHardShutdown()', async () => {
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

      // Имитируем триггер системного сигнала
      await registeredCallback();

      expect(shutdownSpy).not.toHaveBeenCalled();

      shutdownSpy.mockRestore();
    });
  });

  describe('shutdown', () => {
    it('должен логировать успешное закрытие SDK при успешном разрешении промиса', async () => {
      OpentelemetryBuilder.build(mockConfigService, mockLogger);
      const mockSdkInstance = (NodeSDK as jest.Mock).mock.results[0].value;
      mockSdkInstance.shutdown.mockResolvedValueOnce(undefined);

      await OpentelemetryBuilder.shutdown();

      expect(mockLogger.log).toHaveBeenCalledWith('OpenTelemetry: SDK shut down successfully');
    });

    it('должен логировать ошибку через logger.error, если SDK завершился с ошибкой', async () => {
      OpentelemetryBuilder.build(mockConfigService, mockLogger);
      const mockSdkInstance = (NodeSDK as jest.Mock).mock.results[0].value;
      const mockError = new Error('Test Shutdown Failure');
      mockSdkInstance.shutdown.mockRejectedValueOnce(mockError);

      await OpentelemetryBuilder.shutdown();

      expect(mockLogger.error).toHaveBeenCalledWith('OpenTelemetry: Error shutting down SDK', mockError);
    });

    it('не должен ничего делать, если метод shutdown вызван до метода build', async () => {
      await OpentelemetryBuilder.shutdown();
      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
