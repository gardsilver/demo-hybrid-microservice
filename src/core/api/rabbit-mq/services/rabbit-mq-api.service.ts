import { Inject, Injectable } from '@nestjs/common';
import { MainRequest, MainResponse } from 'protos/compiled/demo/service/MainService';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import {
  IRabbitMqConsumeMessage,
  IRabbitMqProducerMessage,
  IRabbitMqPublishOptionsBuilder,
  RabbitMqAsyncContext,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import {
  RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI,
  RabbitMqClientService,
} from 'src/modules/rabbit-mq/rabbit-mq-client';
import { CommonApiService } from 'src/core/api/common';

@Injectable()
export class RabbitMqApiService {
  private logger: IElkLoggerService;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI)
    private readonly publishOptionsBuilder: IRabbitMqPublishOptionsBuilder,
    private readonly service: CommonApiService,
    private readonly clientService: RabbitMqClientService,
  ) {
    this.logger = this.loggerBuilder.build({ module: RabbitMqApiService.name });
  }

  async sendResponse(request: IRabbitMqConsumeMessage<MainRequest>): Promise<boolean> {
    const response = await this.search(request);

    if (response) {
      return await this.clientService.request<MainResponse>(response, { publishOptionsBuilderOptions: { skip: true } });
    }

    return false;
  }

  async search(request: IRabbitMqConsumeMessage<MainRequest>): Promise<IRabbitMqProducerMessage<MainResponse>> {
    const context = RabbitMqAsyncContext.instance.extend();

    if (!context.replyTo) {
      this.logger.error('Not find reply queue', {
        payload: {
          request,
        },
      });

      return undefined;
    }

    const model = await this.service.getUser(request.content.query);

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
      queue: context.replyTo,
      content: response,
      publishOptions: this.publishOptionsBuilder.build({
        asyncContext: {
          ...context,
          replyTo: undefined,
        },
        publishOptions: {
          headers: request.properties.headers,
        },
      }),
    };
  }
}
