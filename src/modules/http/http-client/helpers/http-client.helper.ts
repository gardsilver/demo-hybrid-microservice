import { AxiosRequestConfig } from 'axios';
import { IHeaders, UrlHelper } from 'src/modules/common';
import { MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { PrometheusLabels } from 'src/modules/prometheus';
import { IHttpClientError } from '../errors/http-client.error';
import { IHttpRequestOptions, IHttpRequest } from '../types/types';
import { HTTP_CLIENT_DEFAULT_OPTIONS } from '../types/constants';

export class HttpClientHelper {
  public static canRetry<T, D>(error: IHttpClientError<T, D>, options?: IHttpRequestOptions): boolean {
    if (options?.retryOptions?.statusCodes?.length) {
      return options?.retryOptions?.statusCodes.includes(error.statusCode);
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static buildAxiosRequest<Req = any>(request: IHttpRequest<Req>, headers?: IHeaders): AxiosRequestConfig<Req> {
    const axiosOptions = {
      ...request,
      headers: headers || request.headers,
    } as AxiosRequestConfig<Req>;

    if (axiosOptions.timeout) {
      if (axiosOptions.transitional) {
        axiosOptions.transitional.clarifyTimeoutError = true;
      } else {
        axiosOptions.transitional = { clarifyTimeoutError: true };
      }
      axiosOptions.timeoutErrorMessage = `HTTP Request Timeout (${axiosOptions.timeout / MILLISECONDS_IN_SECOND} sec)`;
    }

    return axiosOptions;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static buildPrometheusLabels<Req = any>(uri: string, request: IHttpRequest<Req>): PrometheusLabels {
    try {
      const parseUrl = UrlHelper.parse(uri);

      return {
        method: request.method.toUpperCase(),
        ...parseUrl,
      };
    } catch {
      return {
        method: request.method.toUpperCase(),
        hostname: uri,
        pathname: '',
      };
    }
  }

  public static mergeRequestOptions(
    globalOptions: IHttpRequestOptions,
    options?: IHttpRequestOptions,
  ): IHttpRequestOptions {
    const requestOptions: IHttpRequestOptions = {
      headersBuilderOptions: {
        ...globalOptions.headersBuilderOptions,
        ...options?.headersBuilderOptions,
      },
      retryOptions: {
        ...HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions,
        ...globalOptions.retryOptions,
        ...options?.retryOptions,
      },
    };

    if (!requestOptions.retryOptions.delay) {
      requestOptions.retryOptions.delay = HTTP_CLIENT_DEFAULT_OPTIONS.retryOptions.delay;
    }

    if (requestOptions.retryOptions.retryMaxCount === undefined || requestOptions.retryOptions.retryMaxCount < 0) {
      requestOptions.retryOptions.retryMaxCount = 0;
    }

    if (requestOptions.retryOptions.timeout === undefined || requestOptions.retryOptions.timeout < 0) {
      requestOptions.retryOptions.timeout = 0;
    }

    if (requestOptions.retryOptions.timeout == 0 && requestOptions.retryOptions.retryMaxCount === 0) {
      requestOptions.retryOptions.retry = false;
    }

    return requestOptions;
  }
}
