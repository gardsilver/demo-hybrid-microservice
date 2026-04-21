import { appendFileSync } from 'fs';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { circularRemove, circularReplacerBuilder } from 'src/modules/common';
import {
  LogLevel,
  LogFormat,
  ILogFields,
  ILogRecord,
  IEncodeFormatter,
  ILogRecordFormatter,
} from '../types/elk-logger.types';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { FileFormatter } from '../formatters/record-encodes/file.formatter';
import { ElkLoggerConfig } from './elk-logger.config';
import { ProcessTraceSpanStore } from './process-trace-span.store';
import { LogFieldsHelper } from '../helpers/log-fields.helper';

export abstract class BaseElkLoggerService {
  private fileFormatter!: FileFormatter;
  protected defaultLogFields: ILogFields = {};
  protected lastLogRecord: ILogRecord | undefined;
  private readonly encodeFormatters: IEncodeFormatter[];
  private readonly recordFormatters: ILogRecordFormatter[];

  constructor(
    protected readonly elkLoggerConfig: ElkLoggerConfig,
    private readonly recordEncodeFormattersFactory: RecordEncodeFormattersFactory,
    formattersFactory: FormattersFactory,
  ) {
    this.recordFormatters = [...formattersFactory.getRecordFormatters()];
    this.encodeFormatters = [...formattersFactory.getEncodeFormatters()];

    if (elkLoggerConfig.getFormatLogRecord() === LogFormat.SHORT) {
      this.fileFormatter = new FileFormatter();
    }

    if (elkLoggerConfig.getDefaultFields()) {
      this.defaultLogFields = Object.assign({}, elkLoggerConfig.getDefaultFields());
    }
  }

  getLastLogRecord(): ILogRecord | undefined {
    return this.lastLogRecord;
  }

  protected formatTimestamp(): string {
    return new DateTimestamp().format(this.elkLoggerConfig.getTimestampFormat());
  }

  protected format(record: ILogRecord): string | undefined {
    const formatter = this.recordEncodeFormattersFactory.getFormatter(this.elkLoggerConfig.getFormatLogRecord());

    if (!formatter) {
      return;
    }

    return formatter.transform(record);
  }

  protected print(logFields: ILogFields): string | undefined {
    const record: ILogRecord = LogFieldsHelper.merge(
      {
        ...this.defaultLogFields,
      },
      {
        ...logFields,
        timestamp: this.formatTimestamp(),
      },
    ) as ILogRecord;

    if (record.module && !this.isLogModuleEnabled(record)) {
      return;
    }

    const normalizeRecord = this.actualizeTraceSpan(
      this.recordFormatters?.length
        ? this.recordFormatters.reduce((store, formatter) => {
            return store ? formatter.transform(store) : store;
          }, record)
        : (circularRemove(record) as ILogRecord),
    );

    this.lastLogRecord = Object.assign({}, normalizeRecord);

    const stringLog = this.encodeFormatters.length
      ? this.encodeFormatters.reduce((store, encoder) => {
          return store === undefined || store === '' ? store : encoder.transform(store);
        }, this.format(normalizeRecord))
      : JSON.stringify(normalizeRecord, circularReplacerBuilder());

    if (!(stringLog === undefined || stringLog === '')) {
      process['stdout'].write(stringLog + '\n');

      const fileDescriptor = this.elkLoggerConfig.getFileDescriptor();
      if (this.fileFormatter && fileDescriptor !== undefined) {
        appendFileSync(fileDescriptor, this.fileFormatter.transform(this.lastLogRecord), 'utf8');
      }
    }

    return stringLog;
  }

  protected isLogLevelEnabled(level: LogLevel): boolean {
    return !this.elkLoggerConfig.getLogLevels().length || this.elkLoggerConfig.getLogLevels().includes(level);
  }

  protected isLogModuleEnabled(record: ILogRecord): boolean {
    if (!this.elkLoggerConfig.getIgnoreModules().length || [LogLevel.ERROR, LogLevel.FATAL].includes(record.level)) {
      return true;
    }

    const paths = record.module.split('.');

    let path = '';

    for (const tgt of paths) {
      path += path === '' ? tgt : `.${tgt}`;

      if (this.elkLoggerConfig.getIgnoreModules().includes(path)) {
        return false;
      }
    }

    return true;
  }

  private actualizeTraceSpan(record: ILogRecord): ILogRecord {
    const fallback = ProcessTraceSpanStore.instance.get();

    if (!record.traceId) {
      record.traceId = fallback.traceId;
    }
    if (!record.spanId) {
      record.spanId = fallback.spanId;
    }
    if (!record.parentSpanId || record.parentSpanId === record.spanId) {
      record.parentSpanId = '';
    }

    return record;
  }
}
