import { Injectable } from '@nestjs/common';
import { ILogRecord, ILogRecordFormatter } from '../../types/elk-logger.types';
import { ElkLoggerConfig } from './../../services/elk-logger.config';

const defaultOrders = [
  'level',
  'message',
  'module',
  'timestamp',
  'markers',
  'businessData',
  'traceId',
  'initialSpanId',
  'spanId',
  'parentSpanId',
  'payload',
];

@Injectable()
export class SortFieldsFormatter implements ILogRecordFormatter {
  private orderList: string[];

  constructor(elkLoggerConfig: ElkLoggerConfig) {
    this.orderList = elkLoggerConfig.getSortFields();
    for (const fieldName of defaultOrders) {
      if (!this.orderList.includes(fieldName)) {
        this.orderList.push(fieldName);
      }
    }
  }

  priority(): number {
    return Infinity;
  }

  transform(from: ILogRecord): ILogRecord {
    const tgt: Partial<ILogRecord> = {};
    for (const key of this.orderList) {
      if (from[key] !== undefined) {
        tgt[key] = from[key];
      }
    }

    return Object.assign(tgt, from);
  }
}
