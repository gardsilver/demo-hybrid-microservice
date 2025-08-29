import { HttpClientTimeoutError } from './http-client.timeout.error';

describe(HttpClientTimeoutError.name, () => {
  it('default', async () => {
    const error = new HttpClientTimeoutError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
    }).toEqual({
      message: 'HTTP Server TimeoutError',
      statusCode: 'timeout',
      name: 'Http Client TimeoutError',
    });
  });
});
