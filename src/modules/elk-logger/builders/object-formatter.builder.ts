import { AggregateErrorObjectFormatter } from '../formatters/objects/aggregate-error.object-formatter';
import { ErrorObjectFormatter } from '../formatters/objects/error.object-formatter';
import { UnknownFormatter } from '../formatters/objects/unknown-formatter';
import { ObjectFormatter as RecordObjectFormatter } from '../formatters/records/object.formatter';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { ObjectFormatter, ErrorFormatter } from '../types/elk-logger.types';

export abstract class ObjectFormatterBuilder {
  public static build(
    elkLoggerConfig: ElkLoggerConfig,
    options?: {
      exceptionFormatters?: ErrorFormatter[];
      objectFormatters?: ObjectFormatter[];
    },
  ): RecordObjectFormatter {
    let exceptionFormatters: ErrorFormatter[] = [new AggregateErrorObjectFormatter()];

    if (options?.exceptionFormatters?.length) {
      exceptionFormatters = exceptionFormatters.concat(options.exceptionFormatters);
    }

    const errorObjectFormatter = new ErrorObjectFormatter(exceptionFormatters);

    const objectFormatters: ObjectFormatter[] = options?.objectFormatters?.length ? options.objectFormatters : [];

    objectFormatters.push(errorObjectFormatter);

    const unknownFormatter = new UnknownFormatter(elkLoggerConfig, objectFormatters);

    errorObjectFormatter.setUnknownFormatter(unknownFormatter);

    return new RecordObjectFormatter(unknownFormatter);
  }
}
