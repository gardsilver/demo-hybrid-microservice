import { HttpStatusCode, AxiosError } from 'axios';

export const HTTP_CLIENT_DEFAULT_OPTIONS = {
  requestOptions: {
    timeout: 15_000,
  },
  retryOptions: {
    timeout: 120_000,
    delay: 5_000,
    retryMaxCount: 5,
    statusCodes: [
      HttpStatusCode.RequestTimeout,
      HttpStatusCode.BadGateway,
      HttpStatusCode.ServiceUnavailable,
      HttpStatusCode.GatewayTimeout,
      AxiosError.ECONNABORTED,
      AxiosError.ETIMEDOUT,
      'ECONNREFUSED',
      'ECONNRESET',
    ],
  },
};
