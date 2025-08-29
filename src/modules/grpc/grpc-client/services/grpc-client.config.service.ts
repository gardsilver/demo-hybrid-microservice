import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { IGrpcRequestOptions } from '../types/types';
import { GRPC_CLIENT_DEFAULT_OPTIONS } from '../types/constants';

@Injectable()
export class GrpcClientConfigService {
  private requestTimeout: number;
  private enabledRetry: boolean;
  private retryTimeout: number | false;
  private retryDelay: number;
  private retryMaxCount: number | false;
  private retryStatusCodes: Array<string | number> = [];

  constructor(config: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(config, 'GRPC_CLIENT_');

    const requestTimeout = configServiceHelper.parseInt('REQUEST_TIMEOUT', false);
    const retryTimeout = configServiceHelper.parseInt('RETRY_TIMEOUT', false);
    const retryDelay = configServiceHelper.parseInt('RETRY_DELAY', false);
    const retryMaxCount = configServiceHelper.parseInt('RETRY_MAX_COUNT', false);
    const retryStatusCodes = configServiceHelper.parseArray('RETRY_STATUS_CODES');

    this.requestTimeout =
      requestTimeout === false || requestTimeout < 1
        ? GRPC_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout
        : requestTimeout;
    this.enabledRetry = configServiceHelper.parseBoolean('RETRY_ENABLED');
    this.retryTimeout =
      retryTimeout !== false && retryTimeout < 1 ? GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.timeout : retryTimeout;
    this.retryDelay =
      retryDelay === false || retryDelay < 1 ? GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.delay : retryDelay;
    this.retryMaxCount =
      retryMaxCount !== false && retryMaxCount < 1
        ? GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.retryMaxCount
        : retryMaxCount;
    this.retryStatusCodes =
      retryStatusCodes.length === 0
        ? GRPC_CLIENT_DEFAULT_OPTIONS.retryOptions.statusCodes
        : retryStatusCodes.map((code) => {
            const numCode = parseInt(code);

            if (!isNaN(numCode)) {
              return numCode;
            }

            return code;
          });
  }

  getGrpcRequestOptions(): IGrpcRequestOptions {
    return {
      requestOptions: {
        timeout: this.requestTimeout,
      },
      retryOptions: {
        retry: this.enabledRetry,
        timeout: this.retryTimeout === false ? undefined : this.retryTimeout,
        delay: this.retryDelay,
        retryMaxCount: this.retryMaxCount === false ? undefined : this.retryMaxCount,
        statusCodes: this.retryStatusCodes,
      },
    };
  }
}
