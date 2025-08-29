import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IGeneralAsyncContext } from 'src/modules/common';
import { ElkLoggerModule, TraceSpanBuilder } from 'src/modules/elk-logger';
import { AuthModule } from 'src/modules/auth';
import { PrometheusModule } from 'src/modules/prometheus';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { MockConfigService } from 'tests/nestjs';
import { HttpApiController } from './http.api.controller';
import { HttpApiService } from '../services/http-api.service';

describe(HttpApiController.name, () => {
  let context: IGeneralAsyncContext;
  let controller: HttpApiController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        ElkLoggerModule.forRoot(),
        PrometheusModule,
        AuthModule.forRoot(),
        GracefulShutdownModule.forRoot(),
      ],
      controllers: [HttpApiController],
      providers: [HttpApiService],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService({ LOGGER_FORMAT_RECORD: 'NULL' }))
      .compile();

    await module.init();

    controller = module.get(HttpApiController);

    context = generalAsyncContextFactory.build(TraceSpanBuilder.build({}) as unknown as IGeneralAsyncContext);

    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', async () => {
      jest.advanceTimersToNextTimerAsync(4_000);

      const result = await controller.getHello(context);

      expect(result).toBe('Hello World!');
    });
  });
});
