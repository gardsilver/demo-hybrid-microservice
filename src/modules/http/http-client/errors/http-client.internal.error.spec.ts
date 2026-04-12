import { HttpClientInternalError } from './http-client.internal.error';

describe(HttpClientInternalError.name, () => {
  it('default', async () => {
    const error = new HttpClientInternalError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
    }).toEqual({
      message: 'Internal HTTP Server Error',
      statusCode: 'UnknownError',
      name: 'Http Client Internal Error',
    });
  });

  it('with custom message, status and cause', async () => {
    const cause = new Error('cause');
    const error = new HttpClientInternalError('custom message', 500, cause);

    expect(error.message).toBe('custom message');
    expect(error.statusCode).toBe(500);
    expect(error.cause).toBe(cause);
  });
});
