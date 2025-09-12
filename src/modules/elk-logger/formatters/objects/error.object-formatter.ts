import { ExceptionHelper, IKeyValue } from 'src/modules/common';
import { IErrorFormatter, IUnknownFormatter } from '../../types/elk-logger.types';
import { BaseErrorObjectFormatter } from './base-error.object-formatter';

export class ErrorObjectFormatter extends BaseErrorObjectFormatter<Error> {
  constructor(private readonly exceptionFormatters: IErrorFormatter[]) {
    super();
  }

  setUnknownFormatter(unknownFormatter: IUnknownFormatter) {
    super.setUnknownFormatter(unknownFormatter);
    this.exceptionFormatters.forEach((formatter) => formatter.setUnknownFormatter(unknownFormatter));
  }

  canFormat(obj: unknown): obj is Error {
    return obj instanceof Error;
  }

  transform(from: Error): IKeyValue<unknown> {
    const fields =
      this.exceptionFormatters.find((errorFormatter) => errorFormatter.canFormat(from))?.transform(from) ?? {};

    return {
      name: from.name ?? from.constructor.name,
      message: from.message,
      ...fields,
      stack: ExceptionHelper.stackFormat(from.stack),
      cause: this.unknownFormatter.transform(from.cause),
    };
  }
}
