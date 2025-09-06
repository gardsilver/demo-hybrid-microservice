import { HttpStatus } from '@nestjs/common';
import { MockResponse } from './mock.response';

describe(MockResponse.name, () => {
  let response: MockResponse;

  it('default', async () => {
    response = new MockResponse();

    response.send();

    expect({
      getHeaders: response.getHeaders(),
      headerAny: response.header('any'),
      headerNext: response.header('next'),
      getStatus: response.getStatus(),
    }).toEqual({
      getHeaders: {},
      headerAny: undefined,
      headerNext: undefined,
      getStatus: undefined,
    });

    response.status(HttpStatus.ACCEPTED);

    expect(response.getStatus()).toBe(HttpStatus.ACCEPTED);

    response.setHeader('any', 'value');

    expect({
      getHeaders: response.getHeaders(),
      headerAny: response.header('any'),
      headerNext: response.header('next'),
    }).toEqual({
      getHeaders: {
        any: 'value',
      },
      headerAny: 'value',
      headerNext: undefined,
    });
  });

  it('custom', async () => {
    response = new MockResponse({
      status: HttpStatus.OK,
      headers: {
        next: 'next',
      },
    });

    response.send();

    expect({
      getHeaders: response.getHeaders(),
      headerAny: response.header('any'),
      headerNext: response.header('next'),
      getStatus: response.getStatus(),
    }).toEqual({
      getHeaders: { next: 'next' },
      headerAny: undefined,
      headerNext: 'next',
      getStatus: HttpStatus.OK,
    });

    response.status(HttpStatus.ACCEPTED);

    expect(response.getStatus()).toBe(HttpStatus.ACCEPTED);
  });
});
