import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { OpentelemetryConfig } from './opentelemetry.config';

jest.mock('@opentelemetry/sdk-node', () => ({
  ...jest.requireActual('@opentelemetry/sdk-node'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_SDK_NODE_MOCK,
}));

describe('OpentelemetryConfig', () => {
  let mockConfigService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Инициализация и метод getUrl', () => {
    it('должен возвращать адрес коллектора из настроек ConfigService, если он задан', () => {
      const customUrl = 'http://jaeger-ui:4318/v1/traces';

      mockConfigService = new MockConfigService({
        OPENTELEMETRY_URL: `  ${customUrl}   `,
      }) as unknown as ConfigService;

      const config = new OpentelemetryConfig(mockConfigService);

      expect(config.getUrl()).toBe(customUrl);
    });

    it('должен возвращать дефолтный URL-адрес, если в ConfigService передана пустая строка', () => {
      mockConfigService = new MockConfigService({}) as unknown as ConfigService;

      const config = new OpentelemetryConfig(mockConfigService);

      expect(config.getUrl()).toBe('http://localhost:4318/v1/traces');
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
