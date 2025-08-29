import { Injectable } from '@nestjs/common';
import { IElkLoggerServiceBuilder, IElkLoggerService, ILogFields } from '../types/elk-logger.types';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { ElkLoggerService } from '../services/elk-logger.service';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { FormattersFactory } from '../formatters/formatters.factory';
import { TraceSpanHelper } from '../helpers/trace-span.helper';

@Injectable()
export class ElkLoggerServiceBuilder implements IElkLoggerServiceBuilder {
  constructor(
    private readonly elkLoggerConfig: ElkLoggerConfig,
    private readonly recordEncodeFormattersFactory: RecordEncodeFormattersFactory,
    private readonly formattersFactory: FormattersFactory,
  ) {}

  build(defaultFields?: ILogFields): IElkLoggerService {
    const logger = new ElkLoggerService(
      this.elkLoggerConfig,
      this.recordEncodeFormattersFactory,
      this.formattersFactory,
    );

    logger.addDefaultLogFields({
      traceId: TraceSpanHelper.generateRandomValue(),
      ...defaultFields,
    });

    return logger;
  }
}
