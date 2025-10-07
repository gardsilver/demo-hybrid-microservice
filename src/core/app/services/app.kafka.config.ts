import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import {
  IKafkaConsumerOptions,
  IKafkaHealthIndicatorOptions,
  IKafkaProducerOptions,
} from 'src/modules/kafka/kafka-common';

@Injectable()
export class AppKafkaConfig {
  private kafkaBrokers: string[];
  private kafkaClientId: string;
  private kafkaGroupId: string;
  private kafkaRetryStatusCodes: Array<string | number> = [];

  constructor(private readonly configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService);

    this.kafkaBrokers = configServiceHelper.parseArray('KAFKA_BROKERS');
    this.kafkaClientId = this.configService.get<string>('KAFKA_CLIENT_ID');
    this.kafkaGroupId = this.configService.get<string>('KAFKA_GROUP_ID');

    const kafkaRetryStatusCodes = configServiceHelper.parseArray('KAFKA_RETRY_STATUS_CODES');

    this.kafkaRetryStatusCodes =
      kafkaRetryStatusCodes.length === 0
        ? []
        : kafkaRetryStatusCodes.map((code) => {
            const numCode = parseInt(code);

            if (!isNaN(numCode)) {
              return numCode;
            }

            return code;
          });
  }

  getKafkaBrokers(): string[] {
    return this.kafkaBrokers;
  }

  getKafkaClientId(): string {
    return this.kafkaClientId;
  }

  getKafkaGroupId(): string {
    return this.kafkaGroupId;
  }

  getKafkaRetryStatusCodes(): Array<string | number> {
    return this.kafkaRetryStatusCodes;
  }

  getKafkaProducerRetry(): IKafkaProducerOptions['retry'] {
    return {
      timeout: 4_000,
      delay: 500,
    };
  }

  getKafkaConsumerRetry(): IKafkaConsumerOptions['retry'] {
    return {
      timeout: 10_000,
      delay: 1_000,
      retryMaxCount: 20,
      statusCodes: this.getKafkaRetryStatusCodes(),
    };
  }

  getKafkaHealthIndicatorRetry(): IKafkaHealthIndicatorOptions['retry'] {
    return {
      timeout: 4_000,
      delay: 500,
    };
  }
}
