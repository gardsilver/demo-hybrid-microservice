import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { GRPC_CLIENT_DEFAULT_OPTIONS } from '../types/constants';
import { GrpcClientConfigService } from './grpc-client.config.service';

describe(GrpcClientConfigService.name, () => {
  let config: ConfigService;
  let grpcConfig: GrpcClientConfigService;

  it('default', async () => {
    config = new MockConfigService() as undefined as ConfigService;
    grpcConfig = new GrpcClientConfigService(config);

    expect(grpcConfig.getGrpcRequestOptions()).toEqual({
      requestOptions: {
        timeout: GRPC_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout,
      },
      retryOptions: {
        retry: true,
        timeout: undefined,
        delay: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: undefined,
        statusCodes: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.statusCodes,
      },
    });

    config = new MockConfigService({
      GRPC_CLIENT_REQUEST_TIMEOUT: '-10',
      GRPC_CLIENT_RETRY_TIMEOUT: '-10',
      GRPC_CLIENT_RETRY_MAX_COUNT: '-10',
      GRPC_CLIENT_RETRY_DELAY: '-10',
    }) as undefined as ConfigService;
    grpcConfig = new GrpcClientConfigService(config);

    expect(grpcConfig.getGrpcRequestOptions()).toEqual({
      requestOptions: {
        timeout: GRPC_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout,
      },
      retryOptions: {
        retry: true,
        timeout: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.timeout,
        delay: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.retryMaxCount,
        statusCodes: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.statusCodes,
      },
    });
  });

  it('custom', async () => {
    config = new MockConfigService({
      GRPC_CLIENT_RETRY_ENABLED: 'no',
      GRPC_CLIENT_REQUEST_TIMEOUT: '10000',
      GRPC_CLIENT_RETRY_TIMEOUT: '10000',
      GRPC_CLIENT_RETRY_MAX_COUNT: '10000',
      GRPC_CLIENT_RETRY_DELAY: '10000',
      GRPC_CLIENT_RETRY_STATUS_CODES: '1,TIMEOUT,34',
    }) as undefined as ConfigService;
    grpcConfig = new GrpcClientConfigService(config);

    expect(grpcConfig.getGrpcRequestOptions()).toEqual({
      requestOptions: {
        timeout: 10000,
      },
      retryOptions: {
        retry: false,
        timeout: 10000,
        delay: 10000,
        retryMaxCount: 10000,
        statusCodes: [1, 'TIMEOUT', 34],
      },
    });
  });
});
