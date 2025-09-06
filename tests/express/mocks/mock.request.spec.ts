import { MockRequest } from './mock.request';

describe(MockRequest.name, () => {
  let request: MockRequest;

  it('default', async () => {
    request = new MockRequest();

    expect({
      method: request.method,
      route: request.route,
      url: request.url,
      params: request.params,
      headers: request.headers,
      body: request.body,
      headerAny: request.header('any'),
      headerNext: request.header('next'),
    }).toEqual({
      method: undefined,
      route: undefined,
      url: undefined,
      params: undefined,
      headers: {},
      body: undefined,
      headerAny: undefined,
      headerNext: undefined,
    });
  });

  it('custom', async () => {
    request = new MockRequest({
      method: 'method',
      route: 'route',
      url: 'url',
      params: 'params',
      body: 'body',
      headers: {
        next: 'next',
      },
    });

    expect({
      method: request.method,
      route: request.route,
      url: request.url,
      params: request.params,
      headers: request.headers,
      body: request.body,
      headerAny: request.header('any'),
      headerNext: request.header('next'),
    }).toEqual({
      method: 'method',
      route: 'route',
      url: 'url',
      params: 'params',
      body: 'body',
      headers: {
        next: 'next',
      },
      headerAny: undefined,
      headerNext: 'next',
    });
  });
});
