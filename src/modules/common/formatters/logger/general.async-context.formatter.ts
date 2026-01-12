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
    const logFields: ILogFields = {};

    for (const [k, v] of Object.entries(context)) {
      if (['traceId', 'spanId', 'initialSpanId', 'parentSpanId'].includes(k) && v) {
        logFields[k] = v;
      }
    }

    return {
      ...from,
      ...logFields,
    };
  }
}
