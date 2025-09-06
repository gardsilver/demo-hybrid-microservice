import { faker } from '@faker-js/faker';
import { Request } from 'express';
import { IRequest, MockRequest } from '../mocks/mock.request';

export const requestFactory = {
  build: (params?: IRequest): Request => {
    const method = params?.method ?? 'GET';
    const url = params?.url ?? faker.string.uuid().replaceAll('-', '/');
    const path = params?.path ?? faker.string.uuid().replaceAll('-', '/');

    return new MockRequest({
      method,
      route: params?.route ?? {
        path: url,
        stack: [
          {
            keys: [],
            name: '<anonymous>',
            slash: false,
            matchers: [null],
            method: method,
          },
        ],
        methods: {
          [method]: true,
        },
      },
      url,
      path,
      params: params?.params,
      headers: params?.headers,
      body: params?.body,
    }) as undefined as Request;
  },
};
