import { BehaviorSubject, timeout } from 'rxjs';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeaders } from '@nestjs/swagger';
import { Ctx, Payload } from '@nestjs/microservices';
import { MAIN_SERVICE_NAME, MainResponse } from 'protos/compiled/demo/service/MainService';
import { IGeneralAsyncContext, SkipInterceptors } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanHelper,
} from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { HttpAuthGuard, HttpGeneralAsyncContext, HttpLogging, HttpPrometheus } from 'src/modules/http/http-server';
import {
  IRabbitMqAsyncContext,
  IRabbitMqConsumeMessage,
  RabbitMqAsyncContext,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import { EventRabbitMqMessage, RabbitMqContext } from 'src/modules/rabbit-mq/rabbit-mq-server';
import { RabbitMqServers } from 'src/core/app';
import { SearchResponse } from 'src/examples/integrations/common';
import { RabbitMqSearchRequest } from '../types/dto';
import { RabbitMqService } from '../services/rabbit-mq.service';
import { DemoResponseDeserializer } from '../adapters/demo.response.deserializer';

@SkipInterceptors(HttpAuthGuard, HttpLogging, HttpPrometheus)
@Controller('examples/rabbit-mq')
@ApiTags('examples')
@ApiBearerAuth()
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
export class HttpController {
  private logger: IElkLoggerService;
  private readonly responses: BehaviorSubject<IRabbitMqConsumeMessage<MainResponse> | undefined>;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly service: RabbitMqService,
  ) {
    this.responses = new BehaviorSubject<IRabbitMqConsumeMessage<MainResponse> | undefined>(undefined);
    this.logger = this.loggerBuilder.build({ module: 'examples.rabbit-mq' });
  }

  @Post('find')
  async find(
    @Body() request: RabbitMqSearchRequest,
    @HttpGeneralAsyncContext() context: IGeneralAsyncContext,
  ): Promise<SearchResponse> {
    const messageId = TraceSpanHelper.generateRandomValue();

    const status = await RabbitMqAsyncContext.instance.runWithContextAsync(async () => this.service.search(request), {
      ...context,
      messageId,
      replyTo: 'DemoResponse',
    } as IRabbitMqAsyncContext);

    if (status) {
      const response = await this.searchResponse(messageId);

      return {
        ...response.content?.data,
      };
    }

    return { status: 'error' };
  }

  /**
   * @TODO
   *
   * ВАЖНО:
   *   Касается только методов ожидания ответа описанных ниже.
   *   Данный подход предназначен только демонстрации возможностей.
   *   Ни в коем случае не стоит применять аналогичные решения на практике.
   */
  @EventRabbitMqMessage(['DemoResponse'], () => ({
    serverName: RabbitMqServers.MAIN_RABBIT_MQ_BROKER,
    consumer: {
      queue: 'DemoResponse',
      exchange: MAIN_SERVICE_NAME,
      exchangeType: 'direct',
      routing: 'find.response',
      queueOptions: {
        durable: true,
      },
    },
    deserializer: new DemoResponseDeserializer(),
  }))
  async eachMessage(@Payload() data: IRabbitMqConsumeMessage<MainResponse>, @Ctx() ctx: RabbitMqContext) {
    this.logger.info('RMQ read message', {
      payload: {
        request: data,
        options: ctx.getMessageOptions(),
      },
    });
    this.responses.next(data);
  }

  private async searchResponse(messageId: string): Promise<IRabbitMqConsumeMessage<MainResponse>> {
    return new Promise((resolve, reject) => {
      this.logger.info('RMQ waiting response', {
        payload: {
          messageId,
        },
      });

      const subscription = this.responses.pipe(timeout(10_000)).subscribe({
        next: (value) => {
          if (value?.properties?.messageId !== messageId) {
            return;
          }
          setTimeout(() => {
            if (subscription) {
              subscription.unsubscribe();
            }
          });

          this.logger.info('RMQ response success', {
            payload: {
              response: value,
            },
          });

          resolve(value);
        },
        error: (error) => {
          setTimeout(() => {
            if (subscription) {
              subscription.unsubscribe();
            }
          });

          this.logger.error('RMQ response failed', {
            payload: {
              error,
            },
          });

          reject(error as unknown as Error);
        },
      });
    });
  }
}
