import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { HttpClientConfigService } from './http-client.config.service';
import { HTTP_CLIENT_DEFAULT_OPTIONS } from '../types/constants';

describe(HttpClientConfigService.name, () => {
  let config: ConfigService;
  let httpConfig: HttpClientConfigService;

  it('default', async () => {
    config = new MockConfigService() as undefined as ConfigService;
    httpConfig = new HttpClientConfigService(config);

    expect(httpConfig.getRequestTimeout()).toBe(HTTP_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout);
    expect(httpConfig.getHttpRequestOptions()).toEqual({
      retryOptions: {
        retry: true,
        timeout: undefined,
        delay: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: undefined,
        statusCodes: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.statusCodes,
      },
    });

    config = new MockConfigService({
      HTTP_CLIENT_REQUEST_TIMEOUT: '-10',
      HTTP_CLIENT_RETRY_TIMEOUT: '-10',
      HTTP_CLIENT_RETRY_MAX_COUNT: '-10',
      HTTP_CLIENT_RETRY_DELAY: '-10',
    }) as undefined as ConfigService;
    httpConfig = new HttpClientConfigService(config);

    expect(httpConfig.getRequestTimeout()).toBe(HTTP_CLIENT_DEFAULT_OPTIONS.requestOptions.timeout);
    expect(httpConfig.getHttpRequestOptions()).toEqual({
      retryOptions: {
        retry: true,
        timeout: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.timeout,
        delay: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.retryMaxCount,
        statusCodes: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.statusCodes,
      },
    });
  });

  it('custom', async () => {
    config = new MockConfigService({
      HTTP_CLIENT_RETRY_ENABLED: 'no',
      HTTP_CLIENT_REQUEST_TIMEOUT: '10000',
      HTTP_CLIENT_RETRY_TIMEOUT: '10000',
      HTTP_CLIENT_RETRY_MAX_COUNT: '10000',
      HTTP_CLIENT_RETRY_DELAY: '10000',
      HTTP_CLIENT_RETRY_STATUS_CODES: '1,TIMEOUT,34',
    }) as undefined as ConfigService;
    httpConfig = new HttpClientConfigService(config);

    expect(httpConfig.getRequestTimeout()).toBe(10000);
    expect(httpConfig.getHttpRequestOptions()).toEqual({
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
