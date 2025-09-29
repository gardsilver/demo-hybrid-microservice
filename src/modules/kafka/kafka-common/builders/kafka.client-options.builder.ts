import { logLevel } from 'kafkajs';
import { UrlHelper } from 'src/modules/common';
import { IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { KafkaClientConfig, IKafkaClientOptions } from '../types/types';
import { KafkaElkLoggerBuilder } from './kafka.ekf-logger.builder';

export class KafkaClientOptionsBuilder {
  public static build(
    options: IKafkaClientOptions,
    params?: {
      loggerBuilder: IElkLoggerServiceBuilder;
      logFields?: ILogFields;
    },
  ): KafkaClientConfig {
    const brokers = options?.normalizeUrl
      ? options.brokers.map((url) => {
          const normalizeUrl = UrlHelper.normalize(url);

          if (normalizeUrl === false) {
            throw Error(`Не корректный формат url (${url})`);
          }

          return normalizeUrl;
        })
      : options.brokers;

    const kafkaClientConfig: KafkaClientConfig = {
      ...{
        ...options,
        normalizeUrl: undefined,
        useLogger: undefined,
        retry: undefined,
      },
      brokers,
    };

    if (options.useLogger) {
      if (!params?.loggerBuilder) {
        throw new Error('KafkaClientOptionsBuilder: loggerBuilder должно быть задан, если включена опция useLogger.');
      }

      kafkaClientConfig.logLevel = logLevel.INFO;
      kafkaClientConfig.logCreator = KafkaElkLoggerBuilder.build(params);
    } else {
      kafkaClientConfig.logLevel = logLevel.NOTHING;
      kafkaClientConfig.logCreator = KafkaElkLoggerBuilder.build();
    }

    return kafkaClientConfig;
  }
}
