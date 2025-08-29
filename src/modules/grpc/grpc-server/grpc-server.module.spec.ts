import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { GrpcHeadersToAsyncContextAdapter, IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { TestModule, TestService } from 'tests/src/test-module';
import { GrpcServerModule } from './grpc-server.module';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from './types/tokens';
import { IGrpcMetadataResponseBuilder } from './types/types';
import { GrpcErrorResponseFilter } from './filters/grpc.error-response.filter';
import { GrpcAuthGuard } from './guards/grpc.auth.guard';
import { GrpcLogging } from './interceptors/grpc.logging';
import { GrpcPrometheus } from './interceptors/grpc.prometheus';
import { GrpcMetadataResponseBuilder } from './builders/grpc.metadata-response.builder';

class TestHeadersAdapter extends GrpcHeadersToAsyncContextAdapter {
  constructor(private readonly testService: TestService) {
    super();
  }
}

class TestMetadataBuilder extends GrpcMetadataResponseBuilder {
  constructor(private readonly testService: TestService) {
    super();
  }
}

describe(GrpcServerModule.name, () => {
  let headersAdapter: IGrpcHeadersToAsyncContextAdapter;
  let metadataBuilder: IGrpcMetadataResponseBuilder;
  let errorFilter: GrpcErrorResponseFilter;
  let authGuard: GrpcAuthGuard;
  let loggingInterceptor: GrpcLogging;
  let prometheusInterceptor: GrpcPrometheus;

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          AuthModule.forRoot(),
          GrpcServerModule.forRoot(),
        ],
      }).compile();

      headersAdapter = module.get(GRPC_SERVER_HEADERS_ADAPTER_DI);
      metadataBuilder = module.get(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI);
      errorFilter = module.get(GrpcErrorResponseFilter);
      authGuard = module.get(GrpcAuthGuard);
      loggingInterceptor = module.get(GrpcLogging);
      prometheusInterceptor = module.get(GrpcPrometheus);
    });

    it('init', async () => {
      expect(headersAdapter).toBeDefined();
      expect(metadataBuilder).toBeDefined();
      expect(errorFilter).toBeDefined();
      expect(authGuard).toBeDefined();
      expect(loggingInterceptor).toBeDefined();
      expect(prometheusInterceptor).toBeDefined();
    });
  });

  describe('custom', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          AuthModule.forRoot(),
          GrpcServerModule.forRoot({
            imports: [TestModule],
            providers: [TestService],
            headersToAsyncContextAdapter: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return new TestHeadersAdapter(testService);
              },
            },
            metadataResponseBuilder: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return new TestMetadataBuilder(testService);
              },
            },
          }),
        ],
      }).compile();

      headersAdapter = module.get(GRPC_SERVER_HEADERS_ADAPTER_DI);
      metadataBuilder = module.get(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI);
      errorFilter = module.get(GrpcErrorResponseFilter);
      authGuard = module.get(GrpcAuthGuard);
      loggingInterceptor = module.get(GrpcLogging);
      prometheusInterceptor = module.get(GrpcPrometheus);
    });

    it('init', async () => {
      expect(headersAdapter).toBeDefined();
      expect(headersAdapter instanceof TestHeadersAdapter).toBeTruthy();
      expect(metadataBuilder).toBeDefined();
      expect(metadataBuilder instanceof TestMetadataBuilder).toBeTruthy();
      expect(errorFilter).toBeDefined();
      expect(authGuard).toBeDefined();
      expect(loggingInterceptor).toBeDefined();
      expect(prometheusInterceptor).toBeDefined();
    });
  });
});
