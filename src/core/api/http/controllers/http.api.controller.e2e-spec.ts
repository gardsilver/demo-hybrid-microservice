import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { AuthModule } from 'src/modules/auth';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { HttpApiModule } from '../http-api.module';
import { HttpApiController } from './http.api.controller';

jest.mock('src/modules/date-timestamp', () => {
  const actualDateTimestamp = jest.requireActual('src/modules/date-timestamp');

  const mockDateTimestamp = Object.assign({}, actualDateTimestamp);

  mockDateTimestamp.delay = jest.fn(() => Promise.resolve());

  return mockDateTimestamp;
});

describe(HttpApiController.name + ' (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        ElkLoggerModule.forRoot(),
        PrometheusModule,
        AuthModule.forRoot(),
        GracefulShutdownModule.forRoot(),
        HttpApiModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new MockConfigService({
          LOGGER_FORMAT_RECORD: 'NULL',
          GRACEFUL_SHUTDOWN_ENABLED: 'no',
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    const response = request(app.getHttpServer()).get('/app').send({});
    const result = await response;

    expect(result.statusCode).toBe(200);
    expect(result.text).toBe('Hello World!');
  });
});
