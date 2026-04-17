import { ExecutionContext, SetMetadata, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_ALL = Symbol('SKIP_ALL');

export type SkipInterceptorTarget = Type | typeof SKIP_ALL;

export const SKIP_INTERCEPTORS_KEY = 'skipInterceptors';
export const KEEP_INTERCEPTORS_KEY = 'keepInterceptors';

export const SkipInterceptors = (...targets: SkipInterceptorTarget[]) =>
  SetMetadata(SKIP_INTERCEPTORS_KEY, targets);

export const KeepInterceptors = (...targets: Type[]) => SetMetadata(KEEP_INTERCEPTORS_KEY, targets);

export const isSkipped = (context: ExecutionContext, reflector: Reflector, target: Type): boolean => {
  const skip =
    reflector.getAllAndMerge<SkipInterceptorTarget[]>(SKIP_INTERCEPTORS_KEY, [
      context.getClass(),
      context.getHandler(),
    ]) ?? [];

  const keep =
    reflector.getAllAndMerge<Type[]>(KEEP_INTERCEPTORS_KEY, [context.getClass(), context.getHandler()]) ?? [];

  if (keep.includes(target)) {
    return false;
  }

  if (skip.includes(SKIP_ALL)) {
    return true;
  }

  return skip.includes(target);
};
