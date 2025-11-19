/* eslint-disable @typescript-eslint/no-explicit-any */
import { IGeneralAsyncContext } from 'src/modules/common';
import { ILogFields, IOptionLog, LogLevel } from './elk-logger.types';

export enum IElkLoggerEvent {
  BEFORE_CALL,
  AFTER_CALL,
  THROW_CALL,
  FINALLY_CALL,
}

export interface IElkLoggerParams {
  fields?: ILogFields;
  level?: LogLevel;
  message?: string;
  data?: IOptionLog;
}

export interface IElkLoggerOnMethod {
  fields?: ILogFields | ((options: { service?: string; method?: string; methodsArgs?: any[] }) => ILogFields);

  before?:
    | (Omit<IElkLoggerParams, 'fields'> | boolean)
    | ((options: {
        service?: string;
        method?: string;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerParams, 'fields'> | boolean);

  after?:
    | (Omit<IElkLoggerParams, 'fields'> | boolean)
    | ((options: {
        service?: string;
        method?: string;
        result?: any;
        duration?: number;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerParams, 'fields'> | boolean);

  throw?:
    | (Omit<IElkLoggerParams, 'fields'> | boolean)
    | ((options: {
        service?: string;
        method?: string;
        error: unknown;
        duration?: number;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerParams, 'fields'> | boolean);

  finally?:
    | (Omit<IElkLoggerParams, 'fields'> | boolean)
    | ((options: {
        service?: string;
        method?: string;
        duration?: number;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerParams, 'fields'> | boolean);
}

export interface ITargetLoggerOnMethod {
  service: string;
  method: string;
  context?: IGeneralAsyncContext;
  loggerPrams: IElkLoggerParams | false;
}
