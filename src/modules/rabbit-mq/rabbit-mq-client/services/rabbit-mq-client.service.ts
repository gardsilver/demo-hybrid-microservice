import { catchError, finalize, firstValueFrom, tap, throwError } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { PrometheusLabels, PrometheusManager } from 'src/modules/prometheus';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { RABBIT_MQ_CLIENT_PROXY_DI } from '../types/tokens';
import { IRabbitMqSendOptions } from '../types/types';
import { RabbitMqClientProxy } from './rabbit-mq-client.proxy';
import { RabbitMqClientErrorHandler } from '../filters/rabbit-mq-client.error-handler';
import { RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS, RABBIT_MQ_EXTERNAL_REQUEST_FAILED } from '../types/metrics';

@Injectable()
export class RabbitMqClientService {
  constructor(
    @Inject(RABBIT_MQ_CLIENT_PROXY_DI) private readonly clientProxy: RabbitMqClientProxy,
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly handler: RabbitMqClientErrorHandler,
    private readonly prometheusManager: PrometheusManager,
  ) {}

  public async request<T = unknown>(
    request: IRabbitMqProducerMessage<T>,
    options?: IRabbitMqSendOptions<T>,
  ): Promise<boolean> {
    const labels: PrometheusLabels = {
      service: this.clientProxy.getServerName(),
      queue: request.queue ?? '',
      exchange: request.exchange ?? '',
      routing: request.routingKey ?? '',
    };

    const fieldsLogs: ILogFields = {
      module: 'RabbitMqClient',
      markers: [LoggerMarkers.RABBIT_MQ],
      payload: {
        service: this.clientProxy.getServerName(),
        request,
      },
    };

    const logger = this.loggerBuilder.build(fieldsLogs);

    logger.info('RMQ request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });

    const end = this.prometheusManager.histogram().startTimer(RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS, { labels });

    const resp$ = this.clientProxy.send(request, options).pipe(
      tap((status) => {
        this.handler.loggingStatus(status, { fieldsLogs });
      }),
      catchError((exception) => {
        const handleError = this.handler.handleError(exception, { fieldsLogs });

        this.prometheusManager.counter().increment(RABBIT_MQ_EXTERNAL_REQUEST_FAILED, {
          labels: {
            ...labels,
            statusCode: handleError.statusCode?.toString(),
            type: handleError.loggerMarker,
          },
        });

        return throwError(() => handleError);
      }),
      finalize(() => {
        end();
      }),
    );

    return firstValueFrom(resp$);
  }
}
