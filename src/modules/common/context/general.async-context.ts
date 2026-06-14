import { AbstractAsyncContext } from 'src/modules/async-context';
import { IGeneralAsyncContext } from './general.async-context.type';

export class GeneralAsyncContext extends AbstractAsyncContext<IGeneralAsyncContext> {
  public static override instance = new GeneralAsyncContext();

  protected getTracerName(): string {
    return 'common-process-context';
  }
}
