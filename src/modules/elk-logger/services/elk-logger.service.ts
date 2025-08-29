import { Injectable } from '@nestjs/common';
import { LogLevel, ILogFields, ILogRecord, IElkLoggerService, IOptionLog } from '../types/elk-logger.types';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { BaseElkLoggerService } from './base.elk-logger.service';
import { ElkLoggerConfig } from './elk-logger.config';
import { LogFieldsHelper } from '../helpers/log-fields.helper';

@Injectable()
export class ElkLoggerService extends BaseElkLoggerService implements IElkLoggerService {
  constructor(
    elkLoggerConfig: ElkLoggerConfig,
    recordEncodeFormattersFactory: RecordEncodeFormattersFactory,
    formattersFactory: FormattersFactory,
  ) {
    super(elkLoggerConfig, recordEncodeFormattersFactory, formattersFactory);
  }

  addDefaultLogFields(fields: ILogFields): IElkLoggerService {
    this.defaultLogFields = this.defaultLogFields
      ? LogFieldsHelper.merge(this.defaultLogFields, fields)
      : LogFieldsHelper.filterMarkers(fields);

    return this;
  }

  log(level: LogLevel, message: string, data?: IOptionLog): void {
    if (!this.isLogLevelEnabled(level)) {
      return;
    }

    this.print(this.logFieldsComposition(level, message, data));
  }

  trace(message: string, data?: IOptionLog): void {
    this.log(LogLevel.TRACE, message, data);
  }

  debug(message: string, data?: IOptionLog): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: IOptionLog): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: IOptionLog): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: IOptionLog): void {
    this.log(LogLevel.ERROR, message, data);
  }

  fatal(message: string, data?: IOptionLog): void {
    this.log(LogLevel.FATAL, message, data);
  }

  private logFieldsComposition(level: LogLevel, message: string, data?: IOptionLog): ILogFields {
    let logFields: ILogFields = {};

    if (data) {
      logFields = LogFieldsHelper.merge(logFields, data);
    }

    return {
      level,
      message,
      ...logFields,
    } as ILogRecord;
  }
}
