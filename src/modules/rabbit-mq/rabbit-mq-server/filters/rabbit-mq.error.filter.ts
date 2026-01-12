/* eslint-disable @typescript-eslint/no-explicit-any */
import { Catch, Inject, ArgumentsHost } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { RabbitMqHelper } from '../helpers/rabbit-mq.helper';
import { RabbitMqContext } from '../ctx-host/rabbit-mq.context';
import { IRabbitMqConsumeMessage } from '../../rabbit-mq-common';

@Catch()
export class RabbitMqErrorFilter {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  catch(exception: any, host: ArgumentsHost): any {
    if (!RabbitMqHelper.isRabbitMq(host)) {
      return;
    }

    const rabbitMqContext = host.switchToRpc().getContext<RabbitMqContext>();

    this.handleError(exception, rabbitMqContext.getMessage());
  }

  private handleError(exception: any, message: IRabbitMqConsumeMessage): void {
    const logger = this.loggerBuilder.build({
      module: RabbitMqErrorFilter.name,
      markers: [LoggerMarkers.RABBIT_MQ, LoggerMarkers.REQUEST, LoggerMarkers.FAILED],
    });

    logger.error('RMQ handle message failed', {
      payload: {
        message,
        exception,
      },
    });
  }
}
