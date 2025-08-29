import { IAsyncContext } from 'src/modules/async-context';
import { ILogFields, ILogRecord, ILogRecordFormatter } from 'src/modules/elk-logger';
import { GeneralAsyncContext } from '../../context/general.async-context';

export class GeneralAsyncContextFormatter implements ILogRecordFormatter {
  public priority(): number {
    return 0;
  }

  public transform(from: ILogRecord): ILogRecord {
    let context = {} as IAsyncContext;

    try {
      context = GeneralAsyncContext.instance.extend();
    } catch {
      return from;
    }

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
