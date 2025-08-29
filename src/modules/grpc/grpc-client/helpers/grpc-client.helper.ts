import { IGrpcClientError } from '../errors/grpc-client.error';
import { GRPC_CLIENT_DEFAULT_OPTIONS } from '../types/constants';
import { IGrpcRequestOptions } from '../types/types';

export class GrpcClientHelper {
  public static canRetry(error: IGrpcClientError, options?: IGrpcRequestOptions): boolean {
    if (options?.retryOptions?.statusCodes?.length) {
      return options?.retryOptions?.statusCodes.includes(error.statusCode);
    }

    return false;
  }

  public static mergeRequestOptions(
    globalOptions: IGrpcRequestOptions,
    options?: IGrpcRequestOptions,
  ): IGrpcRequestOptions {
    const requestOptions: IGrpcRequestOptions = {
      metadataBuilderOptions: {
        ...globalOptions.metadataBuilderOptions,
        ...options?.metadataBuilderOptions,
      },
      requestOptions: {
        ...globalOptions.requestOptions,
        ...options?.requestOptions,
      },
      retryOptions: {
        ...GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions,
        ...globalOptions.retryOptions,
        ...options?.retryOptions,
      },
    };

    if (!requestOptions.requestOptions.timeout) {
      requestOptions.requestOptions.timeout = GRPC_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout;
    }

    if (!requestOptions.retryOptions.delay) {
      requestOptions.retryOptions.delay = GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay;
    }

    if (requestOptions.retryOptions.retryMaxCount === undefined || requestOptions.retryOptions.retryMaxCount < 0) {
      requestOptions.retryOptions.retryMaxCount = 0;
    }

    if (requestOptions.retryOptions.timeout === undefined || requestOptions.retryOptions.timeout < 0) {
      requestOptions.retryOptions.timeout = 0;
    }

    if (requestOptions.retryOptions.timeout === 0 && requestOptions.retryOptions.retryMaxCount === 0) {
      requestOptions.retryOptions.retry = false;
    }

    return requestOptions;
  }
}
