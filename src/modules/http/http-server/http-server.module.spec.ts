import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { HttpHeadersToAsyncContextAdapter, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { TestModule, TestService } from 'tests/src/test-module';
import { HttpErrorResponseFilter } from './filters/http.error-response.filter';
import { HttpAuthGuard } from './guards/http.auth.guard';
import { HttpLogging } from './interceptors/http.logging';
import { HttpPrometheus } from './interceptors/http.prometheus';
import { HttpHeadersResponse } from './interceptors/http.response-headers';
import { HTTP_SERVER_HEADERS_ADAPTER_DI, HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI } from './types/tokens';
import { IHttpHeadersResponseBuilder } from './types/types';
import { HttpHeadersResponseBuilder } from './builders/http.headers-response.builder';
import { HttpServerModule } from './http-server.module';

class TestHeadersAdapter extends HttpHeadersToAsyncContextAdapter {
  constructor(private readonly testService: TestService) {
    super();
  }
}

class TestHeadersBuilder extends HttpHeadersResponseBuilder {
  constructor(private readonly testService: TestService) {
    super();
  }
}

describe(HttpServerModule.name, () => {
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let headersBuilder: IHttpHeadersResponseBuilder;
  let authGuard: HttpAuthGuard;
  let loggingInterceptor: HttpLogging;
  let prometheusInterceptor: HttpPrometheus;
  let headersResponseInterceptor: HttpHeadersResponse;
  let filter: HttpErrorResponseFilter;

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          AuthModule.forRoot(),
          PrometheusModule,
          HttpServerModule.forRoot(),
        ],
      }).compile();

      headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
      headersBuilder = module.get(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI);
      authGuard = module.get(HttpAuthGuard);
      loggingInterceptor = module.get(HttpLogging);
      prometheusInterceptor = module.get(HttpPrometheus);
      headersResponseInterceptor = module.get(HttpHeadersResponse);
      filter = module.get(HttpErrorResponseFilter);
    });

    it('init', async () => {
      expect(headersAdapter).toBeDefined();
      expect(headersBuilder).toBeDefined();
      expect(authGuard).toBeDefined();
      expect(loggingInterceptor).toBeDefined();
      expect(prometheusInterceptor).toBeDefined();
      expect(headersResponseInterceptor).toBeDefined();
      expect(filter).toBeDefined();
    });
  });

  describe('custom', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          AuthModule.forRoot(),
          PrometheusModule,
          HttpServerModule.forRoot({
            imports: [TestModule],
            providers: [TestService],
            headersToAsyncContextAdapter: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return new TestHeadersAdapter(testService);
              },
            },
            headersResponseBuilder: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return new TestHeadersBuilder(testService);
              },
            },
          }),
        ],
      }).compile();

      headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
      headersBuilder = module.get(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI);
      authGuard = module.get(HttpAuthGuard);
      loggingInterceptor = module.get(HttpLogging);
      prometheusInterceptor = module.get(HttpPrometheus);
      headersResponseInterceptor = module.get(HttpHeadersResponse);
      filter = module.get(HttpErrorResponseFilter);
    });

    it('init', async () => {
      expect(headersAdapter).toBeDefined();
      expect(headersAdapter instanceof TestHeadersAdapter).toBeTruthy();
      expect(headersBuilder).toBeDefined();
      expect(headersBuilder instanceof TestHeadersBuilder).toBeTruthy();
      expect(authGuard).toBeDefined();
      expect(loggingInterceptor).toBeDefined();
      expect(prometheusInterceptor).toBeDefined();
      expect(headersResponseInterceptor).toBeDefined();
      expect(filter).toBeDefined();
    });
  });
});
