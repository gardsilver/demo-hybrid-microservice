import { BehaviorSubject, timeout } from 'rxjs';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeaders } from '@nestjs/swagger';
import { Ctx, Payload } from '@nestjs/microservices';
import { MainResponse } from 'protos/compiled/demo/service/MainService';
import { IGeneralAsyncContext, SkipInterceptors } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanHelper,
} from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { HttpGeneralAsyncContext } from 'src/modules/http/http-server';
import { IKafkaAsyncContext, IKafkaMessage, KafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { ConsumerMode, EventKafkaMessage, KafkaContext } from 'src/modules/kafka/kafka-server';
import { KafkaServers } from 'src/core/app';
import { SearchResponse } from 'src/examples/integrations/common';
import { KafkaSearchRequest } from '../types/dto';
import { DemoResponseDeserializer } from '../adapters/demo.response.deserializer';
import { KafkaService } from '../services/kafka.service';

@SkipInterceptors({
  HttpAuthGuard: true,
  HttpLogging: true,
  HttpPrometheus: true,
})
@Controller('examples/kafka')
@ApiTags('examples')
@ApiBearerAuth()
@ApiHeaders([
  { name: HttpGeneralAsyncContextHeaderNames.TRACE_ID },
  { name: HttpGeneralAsyncContextHeaderNames.SPAN_ID },
])
export class HttpController {
  private logger: IElkLoggerService;
  private readonly responses: BehaviorSubject<IKafkaMessage<MainResponse>>;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly service: KafkaService,
  ) {
    this.responses = new BehaviorSubject<IKafkaMessage<MainResponse>>(undefined);
    this.logger = this.loggerBuilder.build({ module: 'examples.kafka' });
  }

  @Post('find')
  async find(
    @Body() request: KafkaSearchRequest,
    @HttpGeneralAsyncContext() context: IGeneralAsyncContext,
  ): Promise<SearchResponse> {
    const correlationId = context.correlationId ?? TraceSpanHelper.generateRandomValue();

    const status = await KafkaAsyncContext.instance.runWithContextAsync(async () => this.service.search(request), {
      ...context,
      correlationId,
      replyTopic: 'DemoResponse',
    } as IKafkaAsyncContext);

    if (status) {
      const response = await this.searchResponse(correlationId);

      return {
        ...response.value.data,
      };
    }
  }

  /**
   * @TODO
   *
   * ВАЖНО:
   *   Касается только методов ожидания ответа описанных ниже.
   *   Данный подход предназначен только демонстрации возможностей.
   *   Ни в коем случае не стоит применять аналогичные решения на практике.
   */
  @EventKafkaMessage(['DemoResponse'], {
    serverName: KafkaServers.MAIN_KAFKA_BROKER,
    mode: ConsumerMode.EACH_MESSAGE,
    deserializer: new DemoResponseDeserializer(),
  })
  async eachMessage(@Payload() data: IKafkaMessage<MainResponse>, @Ctx() ctx: KafkaContext) {
    this.logger.info('Kafka read message', {
      payload: {
        request: data,
        options: ctx.getMessageOptions(),
      },
    });
    this.responses.next(data);
  }

  async searchResponse(correlationId: string): Promise<IKafkaMessage<MainResponse>> {
    return new Promise((resolve, reject) => {
      this.logger.info('Waiting kafka response', {
        payload: {
          correlationId,
        },
      });

      const subscription = this.responses.pipe(timeout(10_000)).subscribe({
        next: (value) => {
          if (value?.key !== correlationId) {
            return;
          }
          setTimeout(() => {
            if (subscription) {
              subscription.unsubscribe();
            }
          });

          this.logger.info('Kafka response success', {
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

          this.logger.error('Kafka response failed', {
            payload: {
              error,
            },
          });

          reject(error as undefined as Error);
        },
      });
    });
  }
}
