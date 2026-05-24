/* eslint-disable @typescript-eslint/no-explicit-any */
import { AsyncLocalStorage } from 'node:async_hooks';
import { EmptyAsyncContextError, GetAsyncContextValueType, IAsyncContext } from './types';
import { copyMetadata } from 'src/modules/common/utils';

const asyncLocalStorage = new AsyncLocalStorage();

export abstract class AbstractAsyncContext<T = IAsyncContext> {
  public static instance: AbstractAsyncContext<any>;

  private static getStore<S = any>(): S {
    const store = asyncLocalStorage.getStore();

    if (!store) {
      throw new EmptyAsyncContextError();
    }

    return store as S;
  }

  public static define<T = IAsyncContext>(initCallback?: (...methodsArgs: any[]) => T): MethodDecorator {
    return (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      const wrappedMethod = function (this: any, ...args: any[]) {
        return asyncLocalStorage.run(initCallback ? initCallback(...args) : {}, async () => {
          try {
            return originalMethod.apply(this, args);
          } finally {
            asyncLocalStorage.exit(() => {});
          }
        });
      };

      copyMetadata(wrappedMethod, originalMethod);
      descriptor.value = wrappedMethod;

      return descriptor;
    };
  }

  public runWithContext<R, K extends keyof T>(
    originalMethod: () => R,
    context: { [key in K]: GetAsyncContextValueType<T, K> },
  ): R {
    return asyncLocalStorage.run(context, () => {
      try {
        return originalMethod();
      } finally {
        asyncLocalStorage.exit(() => {});
      }
    });
  }

  public async runWithContextAsync<R, K extends keyof T>(
    originalMethod: () => Promise<R>,
    context: { [key in K]: GetAsyncContextValueType<T, K> },
  ): Promise<R> {
    return asyncLocalStorage.run(context, async () => {
      try {
        return await originalMethod();
      } finally {
        asyncLocalStorage.exit(() => {});
      }
    });
  }

  /** Получение значения переменной контекста по ключу */
  public get<K extends keyof T>(key: K): GetAsyncContextValueType<T, K> | undefined {
    return AbstractAsyncContext.getStore()[key];
  }

  /** Безопасное получение значения переменной контекста по ключу */
  public getSafe<K extends keyof T>(key: K): GetAsyncContextValueType<T, K> | undefined {
    try {
      return AbstractAsyncContext.getStore()[key];
    } catch {
      // Nothing
    }
  }

  /** Получение всех значения контекста */
  public extend(): T {
    try {
      return Object.assign({}, AbstractAsyncContext.getStore()) as T;
    } catch {
      return {} as T;
    }
  }

  public set<K extends keyof T>(key: K, value: GetAsyncContextValueType<T, K>): void {
    AbstractAsyncContext.getStore()[key] = value;
  }

  public setMultiple<K extends keyof T>(values: { [key in K]: GetAsyncContextValueType<T, K> }): void {
    const store = AbstractAsyncContext.getStore();

    Object.keys(values).forEach((key) => (store[key] = values[key as K]));
  }
}
