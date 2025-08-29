import { IKeyValue } from 'src/modules/common';

export class EmptyAsyncContextError extends Error {
  constructor() {
    super('Не задан контекст выполнения');
  }
}

export interface IAsyncContext extends IKeyValue {}

export type GetAsyncContextValueType<T = IAsyncContext, K = keyof T> = K extends keyof T ? T[K] : never;
