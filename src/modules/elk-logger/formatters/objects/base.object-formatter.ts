import { IKeyValue } from 'src/modules/common';
import { IUnknownFormatter, ObjectFormatter } from '../../types/elk-logger.types';

export abstract class BaseObjectFormatter<T extends object = object> extends ObjectFormatter<T> {
  protected unknownFormatter: IUnknownFormatter;

  setUnknownFormatter(unknownFormatter: IUnknownFormatter) {
    this.unknownFormatter = unknownFormatter;
  }

  abstract isInstanceOf(obj: unknown): obj is T;
  abstract transform(from: T): IKeyValue<unknown>;
}
