import { Injectable } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';

@Injectable()
export class AppConfig {
  private servicePort: string;
  private grpcHost: string;
  private grpcPort: string;
  private corsOptions: string;
  private kafkaBrokers: string[];
  private kafkaClientId: string;
  private kafkaGroupId: string;
  private kafkaRetryStatusCodes: Array<string | number> = [];

  constructor(private readonly configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService);

    this.servicePort = this.configService.get<string>('SERVICE_PORT', '3000').trim();
    this.corsOptions = this.configService.get<string>('CORS_OPTIONS', '{"origin":"*"}').trim();

    this.grpcHost = this.configService.get<string>('GRPC_HOST', '').trim();
    this.grpcPort = this.configService.get<string>('GRPC_PORT', '').trim();

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

  getServicePort(): number {
    return Number(this.servicePort);
  }

  getGrpcHost(): string {
    return this.grpcHost === '' ? '0.0.0.0' : this.grpcHost;
  }

  getGrpcPort(): number {
    return Number(this.grpcPort);
  }

  getCorsOptions(): CorsOptions {
    return this.corsOptions ? JSON.parse(this.corsOptions) : undefined;
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
}
