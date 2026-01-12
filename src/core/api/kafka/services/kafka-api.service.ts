import { Inject, Injectable } from '@nestjs/common';
import { MainRequest, MainResponse } from 'protos/compiled/demo/service/MainService';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { IKafkaMessage, KafkaAsyncContext, KafkaAsyncContextHeaderNames } from 'src/modules/kafka/kafka-common';
import {
  IKafkaHeadersRequestBuilder,
  IProducerPacket,
  KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI,
} from 'src/modules/kafka/kafka-client';
import { CommonApiService } from 'src/core/api/common';

@Injectable()
export class KafkaApiService {
  private logger: IElkLoggerService;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI) private readonly headerBuilder: IKafkaHeadersRequestBuilder,
    private readonly service: CommonApiService,
  ) {
    this.logger = this.loggerBuilder.build({ module: KafkaApiService.name });
  }

  async search(topic: string, request: IKafkaMessage<MainRequest>): Promise<IProducerPacket<MainResponse>> {
    const context = KafkaAsyncContext.instance.extend();

    if (!context.replyTopic) {
      this.logger.error('Not find reply topic', {
        payload: {
          topic,
          request,
        },
      });

      return {
        topic: undefined,
        data: undefined,
      };
    }

    const model = await this.service.getUser(request.value.query);

    const response: MainResponse = {};

    if (model) {
      response.data = {
        status: 'ok',
        message: `${model.createdAt.toISOString()}: ${model.name}`,
      };
    } else {
      response.data = {
        status: 'Not Found',
      };
    }

    return {
      topic: context.replyTopic,
      data: {
        key: context.correlationId,
        value: response,
        headers: this.headerBuilder.build({
          asyncContext: {
            ...context,
            replyPartition: undefined,
            replyTopic: undefined,
          },
          headers: {
            ...request.headers,
            [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: undefined,
            [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: undefined,
          },
        }),
      },
    };
  }
}
