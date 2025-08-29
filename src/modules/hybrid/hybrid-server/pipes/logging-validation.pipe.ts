import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ILogFields, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';

export class LoggingValidationPipe extends ValidationPipe {
  private logger: IElkLoggerService;

  constructor(loggerBuilder: IElkLoggerServiceBuilder, fields?: ILogFields) {
    super();

    this.logger = loggerBuilder.build({
      module: `${LoggingValidationPipe.name}.${this.transform.name}`,
      ...fields,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      this.logger.error('DTO validation error', {
        payload: {
          data: value,
          error,
        },
      });

      throw error;
    }
  }
}
