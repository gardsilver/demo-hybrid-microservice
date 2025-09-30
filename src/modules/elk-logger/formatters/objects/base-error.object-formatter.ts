import { IKeyValue } from 'src/modules/common';
import { IUnknownFormatter, ErrorFormatter } from '../../types/elk-logger.types';

export abstract class BaseErrorObjectFormatter<T extends object = object> extends ErrorFormatter<T> {
  protected unknownFormatter: IUnknownFormatter;

  setUnknownFormatter(unknownFormatter: IUnknownFormatter) {
    this.unknownFormatter = unknownFormatter;
  }

  abstract isInstanceOf(obj: unknown): obj is T;
  abstract transform(from: T): IKeyValue<unknown>;
}
