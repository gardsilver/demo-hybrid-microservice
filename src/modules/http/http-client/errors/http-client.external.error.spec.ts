import { HttpClientExternalError } from './http-client.external.error';

describe(HttpClientExternalError.name, () => {
  it('default', async () => {
    const error = new HttpClientExternalError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      name: error.name,
    }).toEqual({
      message: 'External HTTP Server Error',
      statusCode: 'UnknownError',
      name: 'Http Client External Error',
    });
  });
});
