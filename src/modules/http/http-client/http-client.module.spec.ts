import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { TestModule, TestService } from 'tests/src/test-module';
import { HttpClientModule } from './http-client.module';
import { HttpClientResponseHandler } from './filters/http-client.response.handler';
import { HttpClientService } from './services/http-client.service';
import { HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI } from './types/tokens';
import { IHttpHeadersRequestBuilder } from './types/types';
import { HttpHeadersRequestBuilder } from './builders/http.headers-request.builder';

class TestHeadersBuilder extends HttpHeadersRequestBuilder {
  constructor(private readonly testService: TestService) {
    super();
  }
}

describe(HttpClientModule.name, () => {
  let headersBuilder: IHttpHeadersRequestBuilder;
  let responseHandler: HttpClientResponseHandler;
  let clientService: HttpClientService;

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          AuthModule.forRoot(),
          PrometheusModule,
          HttpClientModule.register(),
        ],
      }).compile();

      headersBuilder = module.get(HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI);
      responseHandler = module.get(HttpClientResponseHandler);
      clientService = module.get(HttpClientService);
    });

    it('init', async () => {
      expect(headersBuilder).toBeDefined();
      expect(responseHandler).toBeDefined();
      expect(clientService).toBeDefined();
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
          HttpClientModule.register({
            imports: [TestModule],
            providers: [TestService],
            headersRequestBuilder: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return new TestHeadersBuilder(testService);
              },
            },
            httpModuleOptions: {
              imports: [TestModule],
              providers: [TestService],
              options: {
                useValue: {
                  transitional: {},
                },
              },
            },
            requestOptions: {
              useValue: {},
            },
          }),
        ],
      }).compile();

      headersBuilder = module.get(HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI);
      responseHandler = module.get(HttpClientResponseHandler);
      clientService = module.get(HttpClientService);
    });

    it('init', async () => {
      expect(headersBuilder).toBeDefined();
      expect(headersBuilder instanceof TestHeadersBuilder).toBeTruthy();
      expect(responseHandler).toBeDefined();
      expect(clientService).toBeDefined();
    });
  });
});
