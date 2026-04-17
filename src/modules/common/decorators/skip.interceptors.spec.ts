import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import {
  isSkipped,
  KEEP_INTERCEPTORS_KEY,
  KeepInterceptors,
  SKIP_ALL,
  SKIP_INTERCEPTORS_KEY,
  SkipInterceptors,
} from './skip.interceptors';

class FooGuard {}
class BarInterceptor {}
class BazInterceptor {}

@SkipInterceptors(FooGuard, BarInterceptor)
class ClassLevelSkip {
  public run() {
    return 'Hello word!';
  }
}

@SkipInterceptors(SKIP_ALL)
class ClassLevelSkipAll {
  public run() {
    return 'Hello word!';
  }
}

@KeepInterceptors(FooGuard)
class ClassLevelKeep {
  public run() {
    return 'Hello word!';
  }
}

describe('Skip interceptors decorators', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('SkipInterceptors stores class references as metadata', () => {
    const targets = Reflect.getMetadata(SKIP_INTERCEPTORS_KEY, ClassLevelSkip);
    expect(targets).toEqual([FooGuard, BarInterceptor]);
  });

  it('SkipInterceptors with SKIP_ALL stores sentinel', () => {
    const targets = Reflect.getMetadata(SKIP_INTERCEPTORS_KEY, ClassLevelSkipAll);
    expect(targets).toEqual([SKIP_ALL]);
  });

  it('KeepInterceptors stores class references as metadata', () => {
    const targets = Reflect.getMetadata(KEEP_INTERCEPTORS_KEY, ClassLevelKeep);
    expect(targets).toEqual([FooGuard]);
  });

  const makeContext = (): ExecutionContext =>
    ({
      getClass: () => 'TestController',
      getHandler: () => 'testHandler',
    }) as unknown as ExecutionContext;

  const makeReflector = (skip: unknown[], keep: unknown[]): Reflector =>
    ({
      getAllAndMerge: (key: string) => (key === SKIP_INTERCEPTORS_KEY ? skip : keep),
    }) as unknown as Reflector;

  it('isSkipped returns true when target is in skip list', () => {
    expect(isSkipped(makeContext(), makeReflector([FooGuard], []), FooGuard)).toBe(true);
  });

  it('isSkipped returns false when target is not listed', () => {
    expect(isSkipped(makeContext(), makeReflector([BarInterceptor], []), FooGuard)).toBe(false);
  });

  it('isSkipped returns true for any target when SKIP_ALL is present', () => {
    expect(isSkipped(makeContext(), makeReflector([SKIP_ALL], []), FooGuard)).toBe(true);
    expect(isSkipped(makeContext(), makeReflector([SKIP_ALL], []), BazInterceptor)).toBe(true);
  });

  it('isSkipped respects keep list (overrides SKIP_ALL)', () => {
    expect(isSkipped(makeContext(), makeReflector([SKIP_ALL], [FooGuard]), FooGuard)).toBe(false);
  });

  it('isSkipped respects keep list (removes an item from class-level skip)', () => {
    expect(isSkipped(makeContext(), makeReflector([FooGuard, BarInterceptor], [FooGuard]), FooGuard)).toBe(false);
    expect(isSkipped(makeContext(), makeReflector([FooGuard, BarInterceptor], [FooGuard]), BarInterceptor)).toBe(true);
  });

  it('isSkipped treats missing metadata as empty lists', () => {
    const reflector = {
      getAllAndMerge: () => undefined,
    } as unknown as Reflector;
    expect(isSkipped(makeContext(), reflector, FooGuard)).toBe(false);
  });
});
