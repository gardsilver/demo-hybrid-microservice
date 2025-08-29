import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { SkipInterceptors, SKIP_INTERCEPTORS_KEY, getSkipInterceptors } from './skip.interceptors';

@SkipInterceptors({
  HttpAuthGuard: true,
  HttpLogging: false,
})
class TestService {
  public run() {
    return 'Hello word!';
  }
}

describe('Skip interceptors decorators', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('SkipInterceptors', async () => {
    const options = Reflect.getMetadata(SKIP_INTERCEPTORS_KEY, TestService);

    expect(options).toEqual({
      All: false,
      HttpAuthGuard: true,
      HttpLogging: false,
      HttpPrometheus: false,
      HttpHeadersResponse: false,
      GrpcAuthGuard: false,
      GrpcLogging: false,
      GrpcPrometheus: false,
    });
  });

  it('getSkipInterceptors', async () => {
    const mockContext = {
      getClass: () => 'http',
      getHandler: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: () => ({
        All: false,
        HttpAuthGuard: true,
        HttpLogging: false,
        HttpPrometheus: false,
        HttpHeadersResponse: false,
        GrpcAuthGuard: false,
        GrpcLogging: true,
        GrpcPrometheus: true,
      }),
    };

    const options = getSkipInterceptors(
      mockContext as undefined as ExecutionContext,
      mockReflector as undefined as Reflector,
    );

    expect(options).toEqual({
      All: false,
      HttpAuthGuard: true,
      HttpLogging: false,
      HttpPrometheus: false,
      HttpHeadersResponse: false,
      GrpcAuthGuard: false,
      GrpcLogging: true,
      GrpcPrometheus: true,
    });
  });
});
