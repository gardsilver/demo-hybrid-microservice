import { ExceptionObjectFormatter } from '../formatters/objects/exception.object-formatter';
import { ObjectFormatter } from '../formatters/records/object.formatter';
import { IObjectFormatter } from '../types/elk-logger.types';

export class ObjectFormatterBuilder {
  public static build(options?: {
    exceptionFormatters?: IObjectFormatter[];
    objectFormatters?: IObjectFormatter[];
  }): ObjectFormatter {
    const exceptionFormatters: IObjectFormatter[] = options?.exceptionFormatters?.length
      ? options.exceptionFormatters
      : [];
    const objectFormatters: IObjectFormatter[] = options?.objectFormatters?.length ? options.objectFormatters : [];

    const exceptionObjectFormatter = new ExceptionObjectFormatter(exceptionFormatters);

    objectFormatters.push(exceptionObjectFormatter);

    exceptionObjectFormatter.setObjectFormatters(objectFormatters);

    return new ObjectFormatter(objectFormatters);
  }
}
