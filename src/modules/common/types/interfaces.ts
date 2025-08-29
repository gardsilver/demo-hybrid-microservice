import { ModuleMetadata, ClassProvider, FactoryProvider, ValueProvider } from '@nestjs/common';
import { IAsyncContext } from 'src/modules/async-context';
import { IHeaders } from './types';

export interface IHeadersToContextAdapter<Ctx = IAsyncContext> {
  adapt(headers: IHeaders): Ctx;
}

export interface IFormatter<From, To> {
  transform(from: From): To;
}
export type ImportsType = ModuleMetadata['imports'];

export interface ServiceClassProvider<T> extends Omit<ClassProvider<T>, 'provide'> {}
export interface ServiceValueProvider<T> extends Omit<ValueProvider<T>, 'provide'> {}
export interface ServiceFactoryProvider<T> extends Omit<FactoryProvider<T>, 'provide'> {}
