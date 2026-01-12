import { Test } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import {
  IRabbitMqAsyncContext,
  IRabbitMqMessagePropertiesToAsyncContextAdapter,
  RabbitMqMessagePropertiesToAsyncContextAdapter,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import { TestModule, TestService } from 'tests/src/test-module';
import { RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI } from './types/tokens';
import { RabbitMqServerStatusService } from './services/rabbit-mq-server.status.service';
import { RabbitMqErrorFilter } from './filters/rabbit-mq.error.filter';
import { RabbitMqServerModule } from './rabbit-mq-server.module';

@Injectable()
class HeadersAdapter implements IRabbitMqMessagePropertiesToAsyncContextAdapter {
  constructor(private testService: TestService) {}

  adapt(): IRabbitMqAsyncContext {
    return {
      ...TraceSpanBuilder.build(),
    };
  }
}

describe(RabbitMqServerModule.name, () => {
  let adapter: IRabbitMqMessagePropertiesToAsyncContextAdapter;
  let serverStatusService: RabbitMqServerStatusService;
  let filter: RabbitMqErrorFilter;

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule, RabbitMqServerModule.forRoot()],
      }).compile();

      adapter = module.get(RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI);
      serverStatusService = module.get(RabbitMqServerStatusService);
      filter = module.get(RabbitMqErrorFilter);
    });

    it('init', async () => {
      expect(adapter).toBeDefined();
      expect(adapter instanceof RabbitMqMessagePropertiesToAsyncContextAdapter).toBeTruthy();
      expect(serverStatusService).toBeDefined();
      expect(filter).toBeDefined();
    });
  });

  describe('custom', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          RabbitMqServerModule.forRoot({
            imports: [TestModule],
            providers: [TestService],
            messagePropertiesAdapter: {
              useClass: HeadersAdapter,
            },
          }),
        ],
      }).compile();

      adapter = module.get(RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI);
      serverStatusService = module.get(RabbitMqServerStatusService);
      filter = module.get(RabbitMqErrorFilter);
    });

    it('init', async () => {
      expect(adapter).toBeDefined();
      expect(adapter instanceof HeadersAdapter).toBeTruthy();
      expect(serverStatusService).toBeDefined();
      expect(filter).toBeDefined();
    });
  });
});
