import { KafkaOptions } from '@nestjs/microservices';
import { IElkLoggerServiceBuilder, ILogFields, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { IKafkaClientProxyBuilderOptions, KafkaRetryConfig } from '../types/types';
import { KafkaClientOptionsBuilder } from './kafka.client-options.builder';
import { KafkaConsumerOptionsBuilder } from './kafka.consumer-options.builder';
import { KafkaProducerOptionsBuilder } from './kafka.producer-options.builder';
import { KAFKA_CONNECTION_RESTART } from '../types/metrics';
import { KafkaElkLoggerBuilderOptions } from './kafka.ekf-logger.builder';

export class KafkaOptionsBuilder {
  private isStop: boolean = false;

  constructor(
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    private readonly kafkaLoggerBuilderOptions?: Omit<KafkaElkLoggerBuilderOptions, 'loggerBuilder'>,
  ) {}

  public stop(): void {
    this.isStop = true;
  }

  public build(options: IKafkaClientProxyBuilderOptions): KafkaOptions['options'] {
    const clientOptions = KafkaClientOptionsBuilder.build(options.client, {
      ...this.kafkaLoggerBuilderOptions,
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
      },
      consumer: options.consumer
        ? {
            ...KafkaConsumerOptionsBuilder.build(options.consumer),
            retry: this.createRetryOptionsWithRestartOnFailure(options.consumer.retry, {
              serverName: options.serverName,
              brokers,
              logFields: {
                module: 'KafkaConsumer',
                ...TraceSpanBuilder.build(),
              },
            }),
          }
        : undefined,
      producer: options.producer
        ? {
            ...KafkaProducerOptionsBuilder.build(options.producer),
          }
        : undefined,
    };
  }

  private createRetryOptionsWithRestartOnFailure(
    options: KafkaRetryConfig | undefined,
    params: {
      serverName: string;
      brokers: string[];
      logFields?: ILogFields;
    },
  ): KafkaRetryConfig {
    const kafkaRetryConfig: KafkaRetryConfig = { ...options };

    const logger = this.loggerBuilder.build({ module: 'Kafka', ...params.logFields });
    if (kafkaRetryConfig.restartOnFailure === undefined) {
      kafkaRetryConfig.restartOnFailure = async (error: Error): Promise<boolean> => {
        const errorType = error.name ?? error.constructor.name;
        const isStop = this.isStop;

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
    }

    return kafkaRetryConfig;
  }
}
