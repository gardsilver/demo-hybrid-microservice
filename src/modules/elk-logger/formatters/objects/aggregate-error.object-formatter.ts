import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from './base-error.object-formatter';

export class AggregateErrorObjectFormatter extends BaseErrorObjectFormatter<AggregateError> {
  isInstanceOf(obj: unknown): obj is AggregateError {
    return obj instanceof AggregateError;
  }

  transform(from: AggregateError): IKeyValue<unknown> {
    return {
      errors: this.unknownFormatter.transform(from.errors),
    };
  }
}
