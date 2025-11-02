/* eslint-disable @typescript-eslint/no-explicit-any */
import { IGeneralAsyncContext } from 'src/modules/common';
import { ILogFields, IOptionLog, LogLevel } from './elk-logger.types';

export enum IElkLoggerEvent {
  BEFORE_CALL,
  AFTER_CALL,
  THROW_CALL,
}

export interface IElkLoggerPrams {
  fields?: ILogFields;
  level?: LogLevel;
  message?: string;
  data?: IOptionLog;
}

export interface IElkLoggerOnMethod {
  fields?: ILogFields | ((options: { methodsArgs?: any[] }) => ILogFields);

  before?:
    | (Omit<IElkLoggerPrams, 'fields'> | false)
    | ((options: { fields?: ILogFields; methodsArgs?: any[] }) => Omit<IElkLoggerPrams, 'fields'> | false);

  after?:
    | (Omit<IElkLoggerPrams, 'fields'> | false)
    | ((options: {
        result?: any;
        duration?: number;
        fields?: ILogFields;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerPrams, 'fields'> | false);

  throw?:
    | (Omit<IElkLoggerPrams, 'fields'> | false)
    | ((options: {
        error: unknown;
        duration?: number;
        fields?: ILogFields;
        methodsArgs?: any[];
      }) => Omit<IElkLoggerPrams, 'fields'> | false);
}

export interface ITargetLoggerOnMethod {
  instanceName: string;
  methodName: string;
  context?: IGeneralAsyncContext;
  loggerPrams: IElkLoggerPrams | false;
}
