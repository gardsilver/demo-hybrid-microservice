import { Injectable } from '@nestjs/common';
import { IAsyncContext } from 'src/modules/async-context';
import { GeneralAsyncContext } from 'src/modules/common';
import { ILogFields, ILogRecord, ILogRecordFormatter } from 'src/modules/elk-logger';

@Injectable()
export class GeneralAsyncContextFormatter implements ILogRecordFormatter {
  public priority(): number {
    return 0;
  }

  public transform(from: ILogRecord): ILogRecord {
    const context: IAsyncContext = GeneralAsyncContext.instance.extend();
    const logFields: Partial<Pick<ILogFields, 'traceId' | 'spanId' | 'initialSpanId' | 'parentSpanId'>> = {};
    const keys = ['traceId', 'spanId', 'initialSpanId', 'parentSpanId'] as const;

    for (const key of keys) {
      if (context[key]) {
        logFields[key] = context[key] as string;
      }
    }

    return {
      ...from,
      ...logFields,
    };
  }
}
