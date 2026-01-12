import { Controller, Inject } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { MAIN_SERVICE_NAME, MainRequest } from 'protos/compiled/demo/service/MainService';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import {
  IRabbitMqConsumeMessage,
  IRabbitMqMessageProperties,
  IRabbitMqMessagePropertiesToAsyncContextAdapter,
  RabbitMqAsyncContext,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import {
  EventRabbitMqMessage,
  RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI,
} from 'src/modules/rabbit-mq/rabbit-mq-server';
import { RabbitMqServers } from 'src/core/app';
import { RabbitMqApiService } from '../services/rabbit-mq-api.service';
import { DemoRequestDeserializer } from '../adapters/demo.request.deserializer';

@Controller()
export class RabbitMqDemoController {
  private logger: IElkLoggerService;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(RABBIT_MQ_SERVER_MESSAGE_PROPERTIES_ADAPTER_DI)
    private readonly messagePropertiesAdapter: IRabbitMqMessagePropertiesToAsyncContextAdapter,
    private readonly apiService: RabbitMqApiService,
  ) {
    this.logger = this.loggerBuilder.build({ module: RabbitMqDemoController.name });
  }

  @EventRabbitMqMessage(['DemoRequest'], () => ({
    serverName: RabbitMqServers.MAIN_RABBIT_MQ_BROKER,
    consumer: {
      queue: 'DemoRequest',
      exchange: MAIN_SERVICE_NAME,
      exchangeType: 'direct',
      routing: 'find.request',
      queueOptions: {
        durable: true,
      },
    },
    deserializer: new DemoRequestDeserializer(),
  }))
  async find(@Payload() request: IRabbitMqConsumeMessage<MainRequest>) {
    this.logger.info('RMQ request', {
      payload: {
        request,
      },
    });

    if (
      await RabbitMqAsyncContext.instance.runWithContextAsync(
        () => {
          return this.apiService.sendResponse(request);
        },
        {
          ...this.messagePropertiesAdapter.adapt(request.properties ?? ({} as undefined as IRabbitMqMessageProperties)),
        },
      )
    ) {
      this.logger.info('RMQ request success', {
        payload: {
          request,
        },
      });
    } else {
      this.logger.error('RMQ request failed', {
        payload: {
          request,
        },
      });
    }
  }
}
