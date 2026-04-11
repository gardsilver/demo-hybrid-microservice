import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { KafkaRetryConfig } from 'src/modules/kafka/kafka-common';

@Injectable()
export class AppKafkaConfig {
  private brokers: string[];
  private clientId: string | undefined;
  private groupId: string | undefined;
  private retryStatusCodes: Array<string | number> = [];

  constructor(private readonly configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService, 'KAFKA_');

    this.brokers = configServiceHelper.parseArray('BROKERS');
    this.clientId = this.configService.get<string>(configServiceHelper.getKeyName('CLIENT_ID'))?.trim();
    this.groupId = this.configService.get<string>(configServiceHelper.getKeyName('GROUP_ID'))?.trim();

    const kafkaRetryStatusCodes = configServiceHelper.parseArray('RETRY_STATUS_CODES');

    this.retryStatusCodes =
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

  getBrokers(): string[] {
    return this.brokers;
  }

  getClientId(): string | undefined {
    return this.clientId;
  }

  getGroupId(): string | undefined {
    return this.groupId;
  }

  getRetryStatusCodes(): Array<string | number> {
    return this.retryStatusCodes;
  }
  getProducerRetry(): Omit<KafkaRetryConfig, 'restartOnFailure'> {
    return {
      maxRetryTime: 1_000,
      initialRetryTime: 200,
      retries: 2,
    };
  }

  getConsumerRetry(): Omit<KafkaRetryConfig, 'restartOnFailure'> {
    return {
      maxRetryTime: 10_000,
      initialRetryTime: 1_000,
      retries: 20,
    };
  }

  getHealthIndicatorRetry(): Omit<KafkaRetryConfig, 'restartOnFailure'> {
    return {
      maxRetryTime: 4_000,
      initialRetryTime: 500,
    };
  }
}
