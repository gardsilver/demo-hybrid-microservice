import { IAsyncContext } from 'src/modules/async-context';
import { ITraceSpan } from 'src/modules/elk-logger';

export interface IGeneralAsyncContext extends IAsyncContext, Partial<ITraceSpan> {
  requestId?: string;
  correlationId?: string;
}
