import { throwError, tap, catchError, finalize, firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { Kafka, Producer, RecordMetadata } from '@nestjs/microservices/external/kafka.interface';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { PrometheusLabels, PrometheusManager } from 'src/modules/prometheus';
import { IKafkaRequest, IKafkaRequestOptions, ProducerMode } from '../types/types';
import { KAFKA_EXTERNAL_REQUEST_DURATIONS, KAFKA_EXTERNAL_REQUEST_FAILED } from '../types/metrics';
import { KAFKA_CLIENT_PROXY_DI, KAFKA_CLIENT_REQUEST_OPTIONS_DI } from '../types/tokens';
import { KafkaClientHelper } from '../helpers/kafka-client.helper';
import { KafkaClientErrorHandler } from '../filters/kafka-client.error.handler';
import { KafkaClientProxy } from './kafka-client.proxy';

@Injectable()
export class KafkaClientService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    @Inject(KAFKA_CLIENT_PROXY_DI) private readonly clientProxy: KafkaClientProxy,
    @Inject(KAFKA_CLIENT_REQUEST_OPTIONS_DI)
    private readonly requestOptions: Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'>,
    private readonly handler: KafkaClientErrorHandler,
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
    const requestOptions = KafkaClientHelper.mergeRequestOptions(this.requestOptions, options);
    const method = Array.isArray(request) ? ProducerMode.SEND_BATCH : ProducerMode.SEND;
    const topics = Array.isArray(request) ? request.map((req) => req.topic).join(',') : request?.topic;

    const labels: PrometheusLabels = {
      service: this.clientProxy.getServerName(),
      method,
      topics,
    };

    const fieldsLogs: ILogFields = {
      module: 'KafkaClient',
      markers: [LoggerMarkers.KAFKA],
      payload: {
        service: this.clientProxy.getServerName(),
        method,
        topics,
        request: Array.isArray(request) ? request.map((req) => req.data) : request?.data,
      },
    };

    const logger = this.loggerBuilder.build(fieldsLogs);

    logger.info('Kafka request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });

    const end = this.prometheusManager.histogram().startTimer(KAFKA_EXTERNAL_REQUEST_DURATIONS, { labels });

    const resp$ = (
      Array.isArray(request)
        ? this.clientProxy.sendBatch(request, requestOptions)
        : this.clientProxy.send(request, requestOptions)
    ).pipe(
      tap((status) => {
        this.handler.loggingStatus(status, { fieldsLogs });
      }),
      catchError((exception) => {
        const handleError = this.handler.handleError(exception, { fieldsLogs });

        this.prometheusManager.counter().increment(KAFKA_EXTERNAL_REQUEST_FAILED, {
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
