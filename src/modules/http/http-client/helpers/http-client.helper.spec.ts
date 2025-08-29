import { UrlHelper } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpClientExternalError } from '../errors/http-client.external.error';
import { IHttpRequest, IHttpRequestOptions } from '../types/types';
import { HttpClientHelper } from './http-client.helper';
import { HTTP_CLIENT_DEFAULT_OPTIONS } from '../types/constants';

describe(HttpClientHelper.name, () => {
  it('canRetry', async () => {
    const error = new HttpClientExternalError('Test error', 200);
    expect(HttpClientHelper.canRetry(error)).toBeFalsy();
    expect(HttpClientHelper.canRetry(error, {})).toBeFalsy();
    expect(HttpClientHelper.canRetry(error, { retryOptions: {} })).toBeFalsy();
    expect(HttpClientHelper.canRetry(error, { retryOptions: { statusCodes: [] } })).toBeFalsy();
    expect(HttpClientHelper.canRetry(error, { retryOptions: { statusCodes: [201] } })).toBeFalsy();
    expect(HttpClientHelper.canRetry(error, { retryOptions: { statusCodes: [200] } })).toBeTruthy();
  });

  it('buildAxiosRequest', async () => {
    let request: IHttpRequest;
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );

    expect(headers['x-trace-id']).toBeDefined();

    request = {
      method: 'GET',
    };

    expect(HttpClientHelper.buildAxiosRequest(request)).toEqual({
      ...request,
    });

    expect(HttpClientHelper.buildAxiosRequest(request, headers)).toEqual({
      ...request,
      headers,
    });

    request = {
      method: 'GET',
      headers,
    };

    expect(HttpClientHelper.buildAxiosRequest(request)).toEqual({
      ...request,
    });

    expect(
      HttpClientHelper.buildAxiosRequest(request, {
        'x-custom-id': 'customId',
        'x-trace-id': 'traceId',
      }),
    ).toEqual({
      ...request,
      headers: {
        'x-custom-id': 'customId',
        'x-trace-id': 'traceId',
      },
    });

    request = {
      method: 'GET',
      timeout: 10,
    };

    expect(HttpClientHelper.buildAxiosRequest(request)).toEqual({
      ...request,
      timeout: 10,
      timeoutErrorMessage: 'HTTP Request Timeout (0.01 sec)',
      transitional: { clarifyTimeoutError: true },
    });

    request = {
      method: 'GET',
      timeout: 20,
      timeoutErrorMessage: 'any message',
      transitional: {
        forcedJSONParsing: false,
        clarifyTimeoutError: false,
      },
    };

    expect(HttpClientHelper.buildAxiosRequest(request)).toEqual({
      ...request,
      timeout: 20,
      timeoutErrorMessage: 'HTTP Request Timeout (0.02 sec)',
      transitional: {
        forcedJSONParsing: false,
        clarifyTimeoutError: true,
      },
    });
  });

  it('buildPrometheusLabels', async () => {
    const request: IHttpRequest = {
      method: 'get',
    };

    jest.spyOn(UrlHelper, 'parse').mockImplementation(() => ({
      hostname: 'hostname',
      pathname: 'pathname',
    }));

    expect(HttpClientHelper.buildPrometheusLabels('http://hostname/pathname', request)).toEqual({
      method: 'GET',
      hostname: 'hostname',
      pathname: 'pathname',
    });

    jest.spyOn(UrlHelper, 'parse').mockImplementation(() => {
      throw new Error('test');
    });

    expect(HttpClientHelper.buildPrometheusLabels('http://hostname/pathname', request)).toEqual({
      method: 'GET',
      hostname: 'http://hostname/pathname',
      pathname: '',
    });
  });

  it('mergeRequestOptions', async () => {
    const globalOptions: IHttpRequestOptions = {
      headersBuilderOptions: {
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

    expect(HttpClientHelper.mergeRequestOptions({})).toEqual({
      headersBuilderOptions: {},
      retryOptions: {
        ...HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions,
      },
    });

    expect(HttpClientHelper.mergeRequestOptions(globalOptions)).toEqual({
      headersBuilderOptions: {
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
    });

    expect(
      HttpClientHelper.mergeRequestOptions(globalOptions, {
        headersBuilderOptions: {
          useZipkin: true,
        },
        retryOptions: {
          retry: true,
          delay: undefined,
          retryMaxCount: -1,
        },
      }),
    ).toEqual({
      headersBuilderOptions: {
        useZipkin: true,
        asArray: false,
        authToken: 'authToken',
      },
      retryOptions: {
        retry: true,
        timeout: 10,
        delay: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: 0,
        statusCodes: [200, 'ERR'],
      },
    });

    expect(
      HttpClientHelper.mergeRequestOptions(globalOptions, {
        headersBuilderOptions: {
          useZipkin: true,
        },
        retryOptions: {
          retry: true,
          delay: undefined,
          timeout: -1,
          retryMaxCount: 10,
        },
      }),
    ).toEqual({
      headersBuilderOptions: {
        useZipkin: true,
        asArray: false,
        authToken: 'authToken',
      },
      retryOptions: {
        retry: true,
        timeout: 0,
        delay: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: 10,
        statusCodes: [200, 'ERR'],
      },
    });

    expect(
      HttpClientHelper.mergeRequestOptions(globalOptions, {
        headersBuilderOptions: {
          useZipkin: true,
        },
        retryOptions: {
          retry: true,
          delay: undefined,
          timeout: 0,
          retryMaxCount: -1,
        },
      }),
    ).toEqual({
      headersBuilderOptions: {
        useZipkin: true,
        asArray: false,
        authToken: 'authToken',
      },
      retryOptions: {
        retry: false,
        timeout: 0,
        delay: HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.delay,
        retryMaxCount: 0,
        statusCodes: [200, 'ERR'],
      },
    });
  });
});
