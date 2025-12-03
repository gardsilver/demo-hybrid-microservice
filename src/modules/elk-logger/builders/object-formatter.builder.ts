import { AggregateErrorObjectFormatter } from '../formatters/objects/aggregate-error.object-formatter';
import { BaseErrorObjectFormatter } from '../formatters/objects/base-error.object-formatter';
import { BaseObjectFormatter } from '../formatters/objects/base.object-formatter';
import { ErrorObjectFormatter } from '../formatters/objects/error.object-formatter';
import { UnknownFormatter } from '../formatters/objects/unknown-formatter';
import { ObjectFormatter as RecordObjectFormatter } from '../formatters/records/object.formatter';
import { ElkLoggerConfig } from '../services/elk-logger.config';

export abstract class ObjectFormatterBuilder {
  public static build(
    elkLoggerConfig: ElkLoggerConfig,
    options?: {
      exceptionFormatters?: BaseErrorObjectFormatter[];
      objectFormatters?: BaseObjectFormatter[];
    },
  ): RecordObjectFormatter {
    let exceptionFormatters: BaseErrorObjectFormatter[] = [new AggregateErrorObjectFormatter()];

    if (options?.exceptionFormatters?.length) {
      exceptionFormatters = exceptionFormatters.concat(options.exceptionFormatters);
    }

    const errorObjectFormatter = new ErrorObjectFormatter(exceptionFormatters);

    const objectFormatters: BaseObjectFormatter[] = options?.objectFormatters?.length ? options.objectFormatters : [];

    objectFormatters.push(errorObjectFormatter);

    const unknownFormatter = new UnknownFormatter(elkLoggerConfig, objectFormatters);

    return new RecordObjectFormatter(unknownFormatter);
  }
}
