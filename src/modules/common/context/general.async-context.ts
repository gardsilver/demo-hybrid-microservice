import { AbstractAsyncContext } from 'src/modules/async-context';
import { IGeneralAsyncContext } from '../types/general.async-context.type';

export class GeneralAsyncContext extends AbstractAsyncContext<IGeneralAsyncContext> {
  public static instance = new GeneralAsyncContext();
}
