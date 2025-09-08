import { ExceptionHelper, IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from '../../types/elk-logger.types';

export class ExceptionObjectFormatter implements IObjectFormatter<Error> {
  private objectFormatters: IObjectFormatter[];

  constructor(private readonly exceptionFormatters: IObjectFormatter[]) {}

  setObjectFormatters(objectFormatters: IObjectFormatter[]) {
    this.objectFormatters = objectFormatters;
  }

  canFormat(obj: unknown): obj is Error {
    return obj instanceof Error;
  }

  transform(from: Error): IKeyValue<unknown> {
    const fields =
      this.exceptionFormatters.find((errorFormatter) => errorFormatter.canFormat(from))?.transform(from) ?? {};

    return {
      type: from.name ?? from.constructor.name,
      message: from.message,
      ...fields,
      stack: ExceptionHelper.stackFormat(from.stack),
      errors:
        'errors' in from
          ? Array.isArray(from['errors'])
            ? from['errors'].map((err) => this.formatCause(err))
            : this.formatCause(from['errors'])
          : undefined,
      cause: this.formatCause(from.cause),
    };
  }

  private formatCause(cause: unknown): unknown | IKeyValue<unknown> {
    if (cause !== undefined && cause !== null && typeof cause === 'object') {
      if (this.canFormat(cause)) {
        return this.transform(cause);
      } else {
        return (
          this.objectFormatters.find((objectFormatter) => objectFormatter.canFormat(cause))?.transform(cause) ?? cause
        );
      }
    }

    return cause;
  }
}
