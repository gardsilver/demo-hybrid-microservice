import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { KafkaRetryConfig } from 'src/modules/kafka/kafka-common';

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
  getKafkaProducerRetry(): Omit<KafkaRetryConfig, 'restartOnFailure'> {
    return {
      maxRetryTime: 1_000,
      initialRetryTime: 200,
      retries: 2,
    };
  }

  getKafkaConsumerRetry(): Omit<KafkaRetryConfig, 'restartOnFailure'> {
    return {
      maxRetryTime: 10_000,
      initialRetryTime: 1_000,
      retries: 20,
    };
  }

  getKafkaHealthIndicatorRetry(): Omit<KafkaRetryConfig, 'restartOnFailure'> {
    return {
      maxRetryTime: 4_000,
      initialRetryTime: 500,
    };
  }
}
