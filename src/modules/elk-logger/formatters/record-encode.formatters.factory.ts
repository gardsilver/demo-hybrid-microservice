import { Injectable } from '@nestjs/common';
import { LogFormat, ILogRecordEncodeFormatter } from '../types/elk-logger.types';
import { FullFormatter } from './record-encodes/full.formatter';
import { ShortFormatter } from './record-encodes/short.formatter';
import { SimpleFormatter } from './record-encodes/simple.formatter';

@Injectable()
export class RecordEncodeFormattersFactory {
  private formatterMap: Map<LogFormat, ILogRecordEncodeFormatter>;

  constructor(fullFormatter: FullFormatter, simpleFormatter: SimpleFormatter, shortFormatter: ShortFormatter) {
    this.formatterMap = new Map<LogFormat, ILogRecordEncodeFormatter>();
    this.formatterMap.set(LogFormat.FULL, fullFormatter);
    this.formatterMap.set(LogFormat.SIMPLE, simpleFormatter);
    this.formatterMap.set(LogFormat.SHORT, shortFormatter);
  }

  getFormatter(format: LogFormat): ILogRecordEncodeFormatter {
    return this.formatterMap.get(format);
  }
}
