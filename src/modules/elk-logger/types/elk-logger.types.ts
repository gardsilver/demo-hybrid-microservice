import { LoggerService, LogLevel as NestLogLevel } from '@nestjs/common';
import { IKeyValue, IFormatter } from 'src/modules/common';
import { ITraceSpan } from './trace-span';

export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export enum LogFormat {
  FULL = 'FULL',
  SIMPLE = 'SIMPLE',
  SHORT = 'SHORT',
  NULL = 'NULL',
}

export interface ILogBody {
  businessData?: IKeyValue;
  payload?: IKeyValue;
}

export interface ILogFields extends ILogBody, Partial<ITraceSpan> {
  level?: LogLevel;
  message?: string;
  module?: string;
  timestamp?: string;
  markers?: string[];
}

export interface ILogRecord extends ILogFields {
  level: LogLevel;
  message: string;
  module: string;
  timestamp: string;
  traceId: string;
  spanId: string;
  initialSpanId: string;
  parentSpanId: null | string;
}

export interface IOptionLog
  extends Partial<
    Pick<
      ILogFields,
      'module' | 'markers' | 'businessData' | 'payload' | 'traceId' | 'spanId' | 'initialSpanId' | 'parentSpanId'
    >
  > {}

export interface IObjectFormatter<T extends object = object> extends IFormatter<T, IKeyValue<unknown>> {
  canFormat(obj: unknown): obj is T;
}

export interface ILogRecordFormatter extends IFormatter<ILogRecord, ILogRecord> {
  priority?(): number;
}
export interface ILogRecordEncodeFormatter extends IFormatter<ILogRecord, string> {}
export interface IEncodeFormatter extends IFormatter<string, string> {
  priority?(): number;
}

export interface INestElkLoggerService extends LoggerService {
  getLastLogRecord(): ILogRecord;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLogLevels?(levels: NestLogLevel[]): any;
}

export interface IElkLoggerService extends Pick<INestElkLoggerService, 'getLastLogRecord'> {
  addDefaultLogFields(fields: ILogFields): IElkLoggerService;
  log(level: LogLevel, message: string, data?: IOptionLog): void;
  trace(message: string, data?: IOptionLog): void;
  debug(message: string, data?: IOptionLog): void;
  info(message: string, data?: IOptionLog): void;
  warn(message: string, data?: IOptionLog): void;
  error(message: string, data?: IOptionLog): void;
  fatal(message: string, data?: IOptionLog): void;
}

export interface IElkLoggerServiceBuilder {
  build(defaultFields?: ILogFields): IElkLoggerService;
}
