import { Test } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import {
  IKafkaAsyncContext,
  IKafkaHeadersToAsyncContextAdapter,
  KafkaHeadersToAsyncContextAdapter,
} from 'src/modules/kafka/kafka-common';
import { TestModule, TestService } from 'tests/src/test-module';
import { KAFKA_SERVER_HEADERS_ADAPTER_DI } from './types/tokens';
import { KafkaServerStatusService } from './services/kafka-server.status.service';
import { KafkaErrorFilter } from './filters/kafka.error.filter';
import { KafkaServerModule } from './kafka-server.module';

@Injectable()
class HeadersAdapter implements IKafkaHeadersToAsyncContextAdapter {
  constructor(private testService: TestService) {}

  adapt(): IKafkaAsyncContext {
    return {
      ...TraceSpanBuilder.build(),
    };
  }
}

describe(KafkaServerModule.name, () => {
  let headersAdapters: IKafkaHeadersToAsyncContextAdapter;
  let serverStatusService: KafkaServerStatusService;
  let filter: KafkaErrorFilter;

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule, KafkaServerModule.forRoot()],
      }).compile();

      headersAdapters = module.get(KAFKA_SERVER_HEADERS_ADAPTER_DI);
      serverStatusService = module.get(KafkaServerStatusService);
      filter = module.get(KafkaErrorFilter);
    });

    it('init', async () => {
      expect(headersAdapters).toBeDefined();
      expect(headersAdapters instanceof KafkaHeadersToAsyncContextAdapter).toBeTruthy();
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
          KafkaServerModule.forRoot({
            imports: [TestModule],
            providers: [TestService],
            headersToAsyncContextAdapter: {
              useClass: HeadersAdapter,
            },
          }),
        ],
      }).compile();

      headersAdapters = module.get(KAFKA_SERVER_HEADERS_ADAPTER_DI);
      serverStatusService = module.get(KafkaServerStatusService);
      filter = module.get(KafkaErrorFilter);
    });

    it('init', async () => {
      expect(headersAdapters).toBeDefined();
      expect(headersAdapters instanceof HeadersAdapter).toBeTruthy();
      expect(serverStatusService).toBeDefined();
      expect(filter).toBeDefined();
    });
  });
});
