import { AggregateErrorObjectFormatter } from '../formatters/objects/aggregate-error.object-formatter';
import { ErrorObjectFormatter } from '../formatters/objects/error.object-formatter';
import { UnknownFormatter } from '../formatters/objects/unknown-formatter';
import { ObjectFormatter } from '../formatters/records/object.formatter';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { IObjectFormatter, IErrorFormatter } from '../types/elk-logger.types';

export class ObjectFormatterBuilder {
  public static build(
    elkLoggerConfig: ElkLoggerConfig,
    options?: {
      exceptionFormatters?: IErrorFormatter[];
      objectFormatters?: IObjectFormatter[];
    },
  ): ObjectFormatter {
    let exceptionFormatters: IErrorFormatter[] = [new AggregateErrorObjectFormatter()];

    if (options?.exceptionFormatters?.length) {
      exceptionFormatters = exceptionFormatters.concat(options.exceptionFormatters);
    }

    const errorObjectFormatter = new ErrorObjectFormatter(exceptionFormatters);

    const objectFormatters: IObjectFormatter[] = options?.objectFormatters?.length ? options.objectFormatters : [];

    objectFormatters.push(errorObjectFormatter);

    const unknownFormatter = new UnknownFormatter(elkLoggerConfig, objectFormatters);

    errorObjectFormatter.setUnknownFormatter(unknownFormatter);

    return new ObjectFormatter(unknownFormatter);
  }
}
