import { IKeyValue } from 'src/modules/common';
import { BaseObjectFormatter } from './base.object-formatter';

export abstract class BaseErrorObjectFormatter<T extends object = object> extends BaseObjectFormatter<T> {
  abstract transform(from: T): IKeyValue<unknown>;
}
