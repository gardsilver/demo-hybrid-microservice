import { Response } from 'express';
import { IResponse, MockResponse } from '../mocks/mock.response';
import { HttpStatus } from '@nestjs/common';

export const responseFactory = {
  build: (params?: IResponse): Response => {
    return new MockResponse({
      status: params?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      headers: params?.headers,
    }) as undefined as Response;
  },
};
