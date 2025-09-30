import { Controller, Inject } from '@nestjs/common';
import { Ctx, Payload } from '@nestjs/microservices';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { ConsumerMode, EventKafkaMessage, KafkaContext, KafkaRequest } from 'src/modules/kafka/kafka-server';
import { KafkaServers } from 'src/core/app';
import { DemoDeserializer } from '../adapters/demo.deserializer';

@Controller()
export class KafkaDemoController {
  private logger: IElkLoggerService;
  constructor(@Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder) {
    this.logger = this.loggerBuilder.build({ module: KafkaDemoController.name });
  }

  @EventKafkaMessage(['DemoRequest'], {
    serverName: KafkaServers.MAIN_KAFKA_BROKER,
    mode: ConsumerMode.EACH_BATCH,
    deserializer: new DemoDeserializer(),
  })
  async eachBatch(@Payload() data: KafkaRequest<string> | KafkaRequest<string>[], @Ctx() ctx: KafkaContext) {
    this.logger.info('Get new KafkaRequest', {
      payload: {
        request: data,
        options: ctx.getMessageOptions(),
      },
    });
  }
}
