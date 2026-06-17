import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { OpentelemetryConfig } from './opentelemetry.config';

describe('OpentelemetryConfig', () => {
  let mockConfigService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Инициализация и метод getUrl', () => {
    it('должен возвращать адрес коллектора из настроек ConfigService, если он задан', () => {
      const customUrl = 'http://jaeger-ui:4318/v1/traces';

      mockConfigService = new MockConfigService({
        TELEMETRY_COLLECTOR_URL: `  ${customUrl}   `,
        TELEMETRY_ENABLED: 'no',
        TELEMETRY_BATCH_MAX_QUEUE_SIZE: '12345',
        TELEMETRY_BATCH_SCHEDULED_DELAY: '567',
        TELEMETRY_FORCED_DURATION_THRESHOLD: '890',
        TELEMETRY_IGNORED_ENDPOINTS: 'ws_ping, health,metrics , prometheus ',
      }) as unknown as ConfigService;

      const config = new OpentelemetryConfig(mockConfigService);

      expect(config.getUrl()).toBe(customUrl);
      expect(config.getIsEnabled()).toBe(false);
      expect(config.getBatchMaxQueueSize()).toBe(12345);
      expect(config.getBatchScheduledDelay()).toBe(567);
      expect(config.getForcedDurationThreshold()).toBe(890);
      expect(config.getIgnoredEndpoints()).toEqual(['ws_ping', 'health', 'metrics', 'prometheus']);
    });

    it('должен возвращать дефолтный URL-адрес, если в ConfigService передана пустая строка', () => {
      mockConfigService = new MockConfigService({}) as unknown as ConfigService;

      const config = new OpentelemetryConfig(mockConfigService);

      expect(config.getUrl()).toBe('http://localhost:4318/v1/traces');
      expect(config.getIsEnabled()).toBe(true);
      expect(config.getBatchMaxQueueSize()).toBe(2048);
      expect(config.getBatchScheduledDelay()).toBe(5000);
      expect(config.getForcedDurationThreshold()).toBe(1500);
      expect(config.getIgnoredEndpoints()).toEqual([]);
    });

    it('должен корректно инициализировать вспомогательные модули ConfigServiceHelper, GracefulShutdown и Prometheus', () => {
      mockConfigService = new MockConfigService({
        GRACEFUL_SHUTDOWN_DESTROY_SIGNAL: 'SIGKILL',
        APPLICATION_NAME: 'Application',
        MICROSERVICE_NAME: 'Microservice',
        MICROSERVICE_VERSION: 'Version',
      }) as unknown as ConfigService;

      const config = new OpentelemetryConfig(mockConfigService);

      expect({
        application: config.getApplicationName(),
        microservice: config.getMicroserviceName(),
        version: config.getMicroserviceVersion(),
        destroySignal: config.getDestroySignal(),
      }).toEqual({
        application: 'Application',
        microservice: 'Microservice',
        version: 'Version',
        destroySignal: 'SIGKILL',
      });
    });
  });
});
