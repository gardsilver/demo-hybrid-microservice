import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type SkipInterceptorsOption = {
  All?: boolean;
  HttpAuthGuard?: boolean;
  HttpLogging?: boolean;
  HttpPrometheus?: boolean;
  HttpHeadersResponse?: boolean;
  GrpcAuthGuard?: boolean;
  GrpcLogging?: boolean;
  GrpcPrometheus?: boolean;
};

export const SKIP_INTERCEPTORS_KEY = 'skipInterceptors';

export const SkipInterceptors = (option?: SkipInterceptorsOption) =>
  SetMetadata(SKIP_INTERCEPTORS_KEY, {
    All: option?.All ?? false,
    HttpAuthGuard: option?.HttpAuthGuard ?? false,
    HttpLogging: option?.HttpLogging ?? false,
    HttpPrometheus: option?.HttpPrometheus ?? false,
    HttpHeadersResponse: option?.HttpHeadersResponse ?? false,
    GrpcAuthGuard: option?.GrpcAuthGuard ?? false,
    GrpcLogging: option?.GrpcLogging ?? false,
    GrpcPrometheus: option?.GrpcPrometheus ?? false,
  } as SkipInterceptorsOption);

export const getSkipInterceptors = (context: ExecutionContext, reflector: Reflector): SkipInterceptorsOption => {
  const option: SkipInterceptorsOption = reflector.getAllAndOverride<SkipInterceptorsOption, string>(
    SKIP_INTERCEPTORS_KEY,
    [context.getClass(), context.getHandler()],
  );

  return {
    All: false,
    HttpAuthGuard: false,
    HttpLogging: false,
    HttpPrometheus: false,
    HttpHeadersResponse: false,
    GrpcAuthGuard: false,
    GrpcLogging: false,
    GrpcPrometheus: false,
    ...option,
  };
};
