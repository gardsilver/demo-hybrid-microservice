import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { AppConfig } from './app.config';

describe(AppConfig.name, () => {
  it('default', async () => {
    const config = new MockConfigService() as ConfigService;
    const appConfig = new AppConfig(config);

    expect({
      getServicePort: appConfig.getServicePort(),
      getGrpcHost: appConfig.getGrpcHost(),
      getGrpcPort: appConfig.getGrpcPort(),
      getCorsOptions: appConfig.getCorsOptions(),
    }).toEqual({
      getServicePort: 3000,
      getGrpcHost: '0.0.0.0',
      getGrpcPort: 0,
      getCorsOptions: { origin: '*' },
    });
  });

  it('custom', async () => {
    const config = new MockConfigService({
      SERVICE_PORT: '1001',
      GRPC_HOST: '127.0.0.1',
      GRPC_PORT: '1002',
      CORS_OPTIONS: '{}',
    }) as ConfigService;
    const appConfig = new AppConfig(config);

    expect({
      getServicePort: appConfig.getServicePort(),
      getGrpcHost: appConfig.getGrpcHost(),
      getGrpcPort: appConfig.getGrpcPort(),
      getCorsOptions: appConfig.getCorsOptions(),
    }).toEqual({
      getServicePort: 1001,
      getGrpcHost: '127.0.0.1',
      getGrpcPort: 1002,
      getCorsOptions: {},
    });
  });

  it('corsOptions as empty', async () => {
    const config = new MockConfigService({
      CORS_OPTIONS: ' ',
    }) as ConfigService;
    const appConfig = new AppConfig(config);

    expect(appConfig.getCorsOptions()).toBeUndefined();
  });
});
