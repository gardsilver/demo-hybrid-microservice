import { Injectable } from '@nestjs/common';
import { circularReplacerBuilder } from 'src/modules/common';
import { ILogRecordEncodeFormatter, ILogRecord } from '../../types/elk-logger.types';

@Injectable()
export class FullFormatter implements ILogRecordEncodeFormatter {
  transform(from: ILogRecord): string {
    return JSON.stringify(from, circularReplacerBuilder());
  }
}
