import { Controller, Inject } from '@nestjs/common';
import { Ctx, Payload } from '@nestjs/microservices';
import { MainRequest, MainResponse } from 'protos/compiled/demo/service/MainService';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { IKafkaHeadersToAsyncContextAdapter, IKafkaMessage, KafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { IKafkaRequest, IProducerPacket, KafkaClientService } from 'src/modules/kafka/kafka-client';
import {
  ConsumerMode,
  EventKafkaMessage,
  IKafkaMessageOptions,
  KafkaContext,
  KAFKA_SERVER_HEADERS_ADAPTER_DI,
} from 'src/modules/kafka/kafka-server';
import { KafkaServers } from 'src/core/app';
import { DemoRequestDeserializer } from '../adapters/demo.request.deserializer';
import { KafkaApiService } from '../services/kafka-api.service';

@Controller()
export class KafkaDemoController {
  private logger: IElkLoggerService;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly service: KafkaApiService,
    @Inject(KAFKA_SERVER_HEADERS_ADAPTER_DI) private readonly headerAdapter: IKafkaHeadersToAsyncContextAdapter,
    private readonly kafkaClientService: KafkaClientService,
  ) {
    this.logger = this.loggerBuilder.build({ module: KafkaDemoController.name });
  }

  @EventKafkaMessage(['DemoRequest'], {
    serverName: KafkaServers.MAIN_KAFKA_BROKER,
    mode: ConsumerMode.EACH_BATCH,
    deserializer: new DemoRequestDeserializer(),
  })
  async eachBatch(@Payload() data: IKafkaMessage<MainRequest>[], @Ctx() ctx: KafkaContext) {
    const messageOptions = ctx.getMessageOptions() as IKafkaMessageOptions[];

    this.logger.info('Kafka read batch message', {
      payload: {
        request: data,
        messageOptions,
      },
    });

    const results: Promise<IProducerPacket<MainResponse> | undefined>[] = [];

    data.forEach((request, index) => {
      results.push(
        KafkaAsyncContext.instance.runWithContextAsync(
          () => {
            return this.service.search(messageOptions[index].topic, request);
          },
          {
            ...this.headerAdapter.adapt(request.headers ?? {}),
          },
        ),
      );
    });

    const responses: Record<string, IKafkaRequest<MainResponse>> = {};

    (await Promise.all(results))
      .filter((response): response is IProducerPacket<MainResponse> => !!response)
      .forEach((response) => {
        if (response.topic in responses) {
          (responses[response.topic].data as IKafkaMessage<MainResponse>[]).push(response.data);
        } else {
          responses[response.topic] = {
            topic: response.topic,
            data: [response.data],
          };
        }
      });

    for (const request of Object.values(responses)) {
      this.kafkaClientService.request(request);
    }
  }
}
