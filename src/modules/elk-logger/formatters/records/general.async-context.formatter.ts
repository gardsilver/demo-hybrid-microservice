import { Injectable } from '@nestjs/common';
import { IAsyncContext } from 'src/modules/async-context';
import { GeneralAsyncContext } from 'src/modules/common';
import { ILogRecord, ILogRecordFormatter } from '../../types/elk-logger.types';
import { ITraceSpan } from '../../types/trace-span';
import { ProcessTraceSpanStore } from '../../services/process-trace-span.store';

const TRACE_KEYS = ['traceId', 'spanId', 'initialSpanId', 'parentSpanId'] as const;
const FALLBACK_KEYS = ['traceId', 'spanId'] as const;

@Injectable()
export class GeneralAsyncContextFormatter implements ILogRecordFormatter {
  public priority(): number {
    return 0;
  }

  public transform(from: ILogRecord): ILogRecord {
    const context: IAsyncContext = GeneralAsyncContext.instance.extend();
    const result: ILogRecord = { ...from };
    let needFallback = false;

    for (const key of TRACE_KEYS) {
      if (result[key]) {
        continue;
      }
      if (context[key]) {
        result[key] = context[key] as string;
        continue;
      }
      if ((FALLBACK_KEYS as readonly string[]).includes(key)) {
        needFallback = true;
      }
    }

    if (needFallback) {
      const fallback: ITraceSpan = ProcessTraceSpanStore.instance.get();

      for (const key of FALLBACK_KEYS) {
        if (!result[key] && fallback[key]) {
          result[key] = fallback[key];
        }
      }
    }

    return result;
  }
}
