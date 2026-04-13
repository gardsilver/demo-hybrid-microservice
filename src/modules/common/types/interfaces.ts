import { ModuleMetadata, ClassProvider, FactoryProvider, ValueProvider } from '@nestjs/common';
import { IAsyncContext } from 'src/modules/async-context';
import { IHeaders } from './types';

export interface IHeadersToContextAdapter<Ctx = IAsyncContext, H = IHeaders> {
  adapt(headers: H): Ctx;
}

export interface IFormatter<From, To> {
  transform(from: From): To;
}
export type ImportsType = ModuleMetadata['imports'];

export interface IServiceClassProvider<T> extends Omit<ClassProvider<T>, 'provide'> {}
export interface IServiceValueProvider<T> extends Omit<ValueProvider<T>, 'provide'> {}
export interface IServiceFactoryProvider<T> extends Omit<FactoryProvider<T>, 'provide'> {}
