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
  fields?: ILogFields | ((options: { methodsArgs?: any[] }) => ILogFields);

  before?:
    | (Omit<IElkLoggerParams, 'fields'> | false)
    | ((options: { methodsArgs?: any[] }) => Omit<IElkLoggerParams, 'fields'> | false);

  after?:
    | (Omit<IElkLoggerParams, 'fields'> | false)
    | ((options: { result?: any; duration?: number; methodsArgs?: any[] }) => Omit<IElkLoggerParams, 'fields'> | false);

  throw?:
    | (Omit<IElkLoggerParams, 'fields'> | false)
    | ((options: {
        error: unknown;
        duration?: number;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerParams, 'fields'> | false);

  finally?:
    | (Omit<IElkLoggerParams, 'fields'> | false)
    | ((options: { duration?: number; methodsArgs?: any[] }) => Omit<IElkLoggerParams, 'fields'> | false);
}

export interface ITargetLoggerOnMethod {
  instanceName: string;
  methodName: string;
  context?: IGeneralAsyncContext;
  loggerPrams: IElkLoggerParams | false;
}
