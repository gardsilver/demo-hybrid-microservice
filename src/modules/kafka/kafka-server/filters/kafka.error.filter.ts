/* eslint-disable @typescript-eslint/no-explicit-any */
import { Catch, Inject, ArgumentsHost } from '@nestjs/common';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KafkaServerHelper } from '../helpers/kafka-server.helper';
import { ConsumerMode, IKafkaMessageOptions } from '../types/types';

@Catch()
export class KafkaErrorFilter {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  catch(exception: any, host: ArgumentsHost): any {
    if (!KafkaServerHelper.isKafka(host)) {
      return;
    }

    const kafkaContext = host.switchToRpc().getContext<KafkaContext>();
    if (kafkaContext.getMode() === ConsumerMode.EACH_MESSAGE) {
      this.handleError(
        exception,
        kafkaContext.getMessage() as KafkaMessage,
        kafkaContext.getMessageOptions() as IKafkaMessageOptions,
      );
    } else {
      const messages = kafkaContext.getMessage() as KafkaMessage[];
      const options = kafkaContext.getMessageOptions() as IKafkaMessageOptions[];

      messages.forEach((message, index) => {
        this.handleError(exception, message, options[index]);
      });
    }
  }

  private handleError(exception: any, message: KafkaMessage, options: IKafkaMessageOptions): void {
    const logger = this.loggerBuilder.build({
      module: KafkaErrorFilter.name,
      markers: [LoggerMarkers.KAFKA, LoggerMarkers.REQUEST, LoggerMarkers.FAILED],
    });

    logger.error('KAFKA handle message failed', {
      payload: {
        message,
        options,
        exception,
      },
    });
  }
}
