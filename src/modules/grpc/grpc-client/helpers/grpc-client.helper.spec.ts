import { GrpcClientExternalException } from '../errors/grpc-client.external.error';
import { GRPC_CLIENT_DEFAULT_OPTIONS } from '../types/constants';
import { IGrpcRequestOptions } from '../types/types';
import { GrpcClientHelper } from './grpc-client.helper';

describe(GrpcClientHelper.name, () => {
  it('canRetry', async () => {
    const error = new GrpcClientExternalException('Test error', 1);
    expect(GrpcClientHelper.canRetry(error)).toBeFalsy();
    expect(GrpcClientHelper.canRetry(error, {})).toBeFalsy();
    expect(GrpcClientHelper.canRetry(error, { retryOptions: {} })).toBeFalsy();
    expect(GrpcClientHelper.canRetry(error, { retryOptions: { statusCodes: [] } })).toBeFalsy();
    expect(GrpcClientHelper.canRetry(error, { retryOptions: { statusCodes: [2] } })).toBeFalsy();
    expect(GrpcClientHelper.canRetry(error, { retryOptions: { statusCodes: [1] } })).toBeTruthy();
  });

  it('mergeRequestOptions', async () => {
    const globalOptions: IGrpcRequestOptions = {
      metadataBuilderOptions: {
        useZipkin: false,
        asArray: false,
        authToken: 'authToken',
      },
      retryOptions: {
        timeout: 10,
        delay: 5,
        retryMaxCount: 2,
        statusCodes: [200, 'ERR'],
      },
    };

    expect(GrpcClientHelper.mergeRequestOptions({})).toEqual({
      metadataBuilderOptions: {},
      requestOptions: {
        timeout: GRPC_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout,
      },
      retryOptions: {
        ...GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions,
      },
    });

    expect(GrpcClientHelper.mergeRequestOptions(globalOptions)).toEqual({
      metadataBuilderOptions: {
        useZipkin: false,
        asArray: false,
        authToken: 'authToken',
      },
      requestOptions: {
        timeout: GRPC_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout,
      },
      retryOptions: {
        timeout: 10,
        delay: 5,
        retryMaxCount: 2,
        statusCodes: [200, 'ERR'],
      },
    });

    expect(
      GrpcClientHelper.mergeRequestOptions(globalOptions, {
        metadataBuilderOptions: {
          useZipkin: true,
        },
        requestOptions: {
          timeout: 10_000,
        },
        retryOptions: {
          retry: false,
          delay: undefined,
          retryMaxCount: -1,
        },
      }),
    ).toEqual({
      metadataBuilderOptions: {
        useZipkin: true,
        asArray: false,
        authToken: 'authToken',
      },
      requestOptions: {
        timeout: 10_000,
      },
      retryOptions: {
        retry: false,
        timeout: 10,
        delay: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: 0,
        statusCodes: [200, 'ERR'],
      },
    });

    expect(
      GrpcClientHelper.mergeRequestOptions(globalOptions, {
        metadataBuilderOptions: {
          useZipkin: true,
        },
        requestOptions: {
          timeout: 10_000,
        },
        retryOptions: {
          retry: true,
          timeout: -10,
          delay: undefined,
          retryMaxCount: 10,
        },
      }),
    ).toEqual({
      metadataBuilderOptions: {
        useZipkin: true,
        asArray: false,
        authToken: 'authToken',
      },
      requestOptions: {
        timeout: 10_000,
      },
      retryOptions: {
        retry: true,
        timeout: 0,
        delay: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: 10,
        statusCodes: [200, 'ERR'],
      },
    });

    expect(
      GrpcClientHelper.mergeRequestOptions(globalOptions, {
        metadataBuilderOptions: {
          useZipkin: true,
        },
        requestOptions: {
          timeout: 10_000,
        },
        retryOptions: {
          retry: true,
          timeout: 0,
          delay: undefined,
          retryMaxCount: -1,
        },
      }),
    ).toEqual({
      metadataBuilderOptions: {
        useZipkin: true,
        asArray: false,
        authToken: 'authToken',
      },
      requestOptions: {
        timeout: 10_000,
      },
      retryOptions: {
        retry: false,
        timeout: 0,
        delay: GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: 0,
        statusCodes: [200, 'ERR'],
      },
    });
  });
});
