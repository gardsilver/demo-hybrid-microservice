import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { AuthModule } from 'src/modules/auth';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { TestModule, TestService } from 'tests/src/test-module';
import { GrpcMetadataRequestBuilder } from './builders/grpc.metadata-request.builder';
import { GrpcClientBuilder } from './builders/grpc-client.builder';
import { GrpcClientModule } from './grpc-client.module';
import { IGrpcMetadataRequestBuilder } from './types/types';
import { GrpcClientResponseHandler } from './filters/grpc-client.response.handler';
import { GrpcClientService } from './services/grpc-client.service';
import { GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI, GRPC_CLIENT_PROXY_DI } from './types/tokens';

class TestRequestBuilder extends GrpcMetadataRequestBuilder {
  constructor(private readonly testService: TestService) {
    super();
  }
}

describe(GrpcClientModule.name, () => {
  let spy;
  let logger: IElkLoggerService;

  let clientProxy: ClientGrpcProxy;
  let requestBuilder: IGrpcMetadataRequestBuilder;
  let responseHandler: GrpcClientResponseHandler;
  let clientService: GrpcClientService;

  beforeEach(async () => {
    jest.clearAllMocks();

    spy = jest
      .spyOn(GrpcClientBuilder, 'buildClientGrpcProxy')
      .mockImplementation(() => ({}) as undefined as ClientGrpcProxy);

    logger = new MockElkLoggerService();
  });

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          AuthModule.forRoot(),
          PrometheusModule,
          GrpcClientModule.register({
            grpcClientProxyBuilderOptions: {
              useValue: {
                url: 'url',
                package: 'package',
                baseDir: '',
                protoPath: [],
              },
            },
          }),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(new MockConfigService())
        .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
        .useValue({
          build: () => logger,
        })
        .compile();

      clientProxy = module.get(GRPC_CLIENT_PROXY_DI);
      requestBuilder = module.get(GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI);
      responseHandler = module.get(GrpcClientResponseHandler);
      clientService = module.get(GrpcClientService);
    });

    it('init', async () => {
      expect(clientProxy).toBeDefined();
      expect(requestBuilder).toBeDefined();
      expect(responseHandler).toBeDefined();
      expect(clientService).toBeDefined();

      expect(spy).toHaveBeenCalledWith({
        url: 'url',
        package: 'package',
        baseDir: '',
        protoPath: [],
      });
    });
  });

  describe('custom', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          AuthModule,
          PrometheusModule,
          GrpcClientModule.register({
            imports: [TestModule],
            providers: [TestService],
            grpcClientProxyBuilderOptions: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return {
                  url: testService.getUrl(),
                  package: 'package',
                  baseDir: '',
                  protoPath: [],
                };
              },
            },
            metadataRequestBuilder: {
              inject: [TestService],
              useFactory: (testService: TestService) => {
                return new TestRequestBuilder(testService);
              },
            },
            requestOptions: {
              useValue: {
                retryOptions: {
                  retryMaxCount: 10,
                },
              },
            },
          }),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(new MockConfigService())
        .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
        .useValue({
          build: () => logger,
        })
        .compile();

      clientProxy = module.get(GRPC_CLIENT_PROXY_DI);
      requestBuilder = module.get(GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI);
      responseHandler = module.get(GrpcClientResponseHandler);
      clientService = module.get(GrpcClientService);
    });

    it('init', async () => {
      expect(clientProxy).toBeDefined();
      expect(requestBuilder).toBeDefined();
      expect(responseHandler).toBeDefined();
      expect(clientService).toBeDefined();

      expect(spy).toHaveBeenCalledWith({
        url: 'http://example.ru',
        package: 'package',
        baseDir: '',
        protoPath: [],
      });
    });

    it('ClientGrpcProxy', async () => {
      expect(clientProxy).toEqual({});
    });

    it('GrpcClientService', async () => {
      expect(clientService['requestOptions']).toEqual({
        retryOptions: {
          retryMaxCount: 10,
        },
      });
    });
  });
});
