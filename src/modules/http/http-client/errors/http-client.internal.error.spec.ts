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
});
