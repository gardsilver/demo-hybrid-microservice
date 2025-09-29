import { KafkaOptions } from '@nestjs/microservices';
import { IElkLoggerServiceBuilder, ILogFields, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { IKafkaClientProxyBuilderOptions, IRetryOptions, KafkaRetryConfig } from '../types/types';
import { KafkaClientOptionsBuilder } from './kafka.client-options.builder';
import { KafkaConsumerOptionsBuilder } from './kafka.consumer-options.builder';
import { KafkaProducerOptionsBuilder } from './kafka.producer-options.builder';
import { KAFKA_CONNECTION_RESTART } from '../types/metrics';

export class KafkaOptionsBuilder {
  private isStop: boolean = false;

  constructor(
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
  ) {}

  public stop(): void {
    this.isStop = true;
  }

  public build(options: IKafkaClientProxyBuilderOptions): KafkaOptions['options'] {
    const clientOptions = KafkaClientOptionsBuilder.build(options.client, {
      loggerBuilder: this.loggerBuilder,
    });

    const brokers: string[] = clientOptions.brokers as undefined as string[];

    return {
      ...{
        ...options,
        client: undefined,
        consumer: undefined,
        producer: undefined,
      },
      client: {
        ...clientOptions,
        retry: options.client.retry ? this.createRetryOptions(options.client.retry) : undefined,
      },
      consumer: options.consumer
        ? {
            ...KafkaConsumerOptionsBuilder.build(options.consumer),
            retry: options.consumer.retry
              ? this.createRetryOptionsWithRestartOnFailure(options.consumer.retry, {
                  serverName: options.serverName,
                  brokers,
                  logFields: {
                    module: 'KafkaConsumer',
                    ...TraceSpanBuilder.build(),
                  },
                })
              : undefined,
          }
        : undefined,
      producer: options.producer
        ? {
            ...KafkaProducerOptionsBuilder.build(options.producer),
            retry: options.producer.retry ? this.createRetryOptions(options.producer.retry) : undefined,
          }
        : undefined,
    };
  }

  private createRetryOptionsWithRestartOnFailure(
    options: IRetryOptions,
    params: {
      serverName: string;
      brokers: string[];
      logFields?: ILogFields;
    },
  ): KafkaRetryConfig {
    const kafkaRetryConfig = this.createRetryOptions(options);

    if (kafkaRetryConfig === undefined) {
      return kafkaRetryConfig;
    }

    const logger = this.loggerBuilder.build({ module: 'Kafka', ...params.logFields });

    kafkaRetryConfig.restartOnFailure = async (error: Error): Promise<boolean> => {
      const errorType = error.name ?? error.constructor.name;
      const isStop = this.isStop || (options.statusCodes?.length && options.statusCodes.includes(errorType));

      logger.error('Kafka restart on failure', {
        payload: {
          status: isStop ? 'stop reconnection' : 'reconnection',
          serverName: params.serverName,
          brokers: params.brokers,
          error,
        },
      });

      this.prometheusManager.counter().increment(KAFKA_CONNECTION_RESTART, {
        labels: {
          service: params.serverName,
          errorType,
        },
      });

      return !isStop;
    };

    return kafkaRetryConfig;
  }

  private createRetryOptions(options: IRetryOptions): KafkaRetryConfig {
    if (options.retry === false) {
      return undefined;
    }

    return {
      maxRetryTime: options.timeout,
      initialRetryTime: options.delay,
      retries: options.retryMaxCount,
    };
  }
}
