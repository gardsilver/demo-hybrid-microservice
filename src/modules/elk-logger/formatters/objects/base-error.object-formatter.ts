import { IKeyValue } from 'src/modules/common';
import { IUnknownFormatter, IErrorFormatter } from '../../types/elk-logger.types';

export abstract class BaseErrorObjectFormatter<T extends object = object> implements IErrorFormatter<T> {
  protected unknownFormatter: IUnknownFormatter;

  setUnknownFormatter(unknownFormatter: IUnknownFormatter) {
    this.unknownFormatter = unknownFormatter;
  }

  abstract canFormat(obj: unknown): obj is T;
  abstract transform(from: T): IKeyValue<unknown>;
}
