import { throwError, tap, catchError, finalize, firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { Kafka, Producer, RecordMetadata } from '@nestjs/microservices/external/kafka.interface';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { PrometheusLabels, PrometheusManager } from 'src/modules/prometheus';
import { IKafkaRequest, IKafkaRequestOptions, ProducerMode } from '../types/types';
import { KAFKA_EXTERNAL_REQUEST_DURATIONS, KAFKA_EXTERNAL_REQUEST_FAILED } from '../types/metrics';
import { KAFKA_CLIENT_PROXY_DI } from '../types/tokens';
import { KafkaClientProxy } from './kafka-client.proxy';

@Injectable()
export class KafkaClientService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    @Inject(KAFKA_CLIENT_PROXY_DI) private readonly clientProxy: KafkaClientProxy,
  ) {}

  public async close(): Promise<void> {
    return this.clientProxy.close();
  }

  public async connect(): Promise<Producer> {
    return this.clientProxy.connect();
  }

  public unwrap<T = [Kafka, Producer]>(): T {
    return this.clientProxy.unwrap();
  }

  public async request<T = unknown>(
    request: IKafkaRequest<T> | IKafkaRequest<T>[],
    options?: IKafkaRequestOptions,
  ): Promise<RecordMetadata[]> {
    const method = Array.isArray(request) ? ProducerMode.SEND_BATCH : ProducerMode.SEND;
    const topics = Array.isArray(request) ? request.map((req) => req.topic).join(',') : request.topic;

    const labels: PrometheusLabels = {
      service: this.clientProxy.getServerName(),
      method,
      topics,
    };

    const fieldsLogs: ILogFields = {
      module: this.clientProxy.getServerName(),
      markers: [LoggerMarkers.KAFKA],
      payload: {
        method,
        topics,
        request,
      },
    };

    const logger = this.loggerBuilder.build(fieldsLogs);

    logger.info('KAFKA request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });

    const end = this.prometheusManager.histogram().startTimer(KAFKA_EXTERNAL_REQUEST_DURATIONS, { labels });

    const resp$ = (
      Array.isArray(request) ? this.clientProxy.sendBatch(request, options) : this.clientProxy.send(request, options)
    ).pipe(
      tap((response) => {
        logger.info('KAFKA request sent', {
          markers: [LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
          payload: {
            status: response,
          },
        });
      }),
      catchError((exception) => {
        logger.error('KAFKA request filed', {
          markers: [LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
          payload: {
            exception,
          },
        });

        this.prometheusManager.counter().increment(KAFKA_EXTERNAL_REQUEST_FAILED, {
          labels: {
            ...labels,
            statusCode: 'exception',
            type: exception.name ?? exception.constructor.name,
          },
        });

        return throwError(() => exception);
      }),
      finalize(() => {
        end();
      }),
    );

    return firstValueFrom(resp$);
  }
}
