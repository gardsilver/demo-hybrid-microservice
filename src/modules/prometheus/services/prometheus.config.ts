import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrometheusConfig {
  private applicationName: string | undefined;
  private microserviceName: string | undefined;
  private microserviceVersion: string | undefined;

  constructor(configService: ConfigService) {
    this.applicationName = configService.get<string>('APPLICATION_NAME');
    this.microserviceName = configService.get<string>('MICROSERVICE_NAME');
    this.microserviceVersion = configService.get<string>('MICROSERVICE_VERSION');
  }

  getApplicationName(): string | undefined {
    return this.applicationName;
  }

  getMicroserviceName(): string | undefined {
    return this.microserviceName;
  }

  getMicroserviceVersion(): string | undefined {
    return this.microserviceVersion;
  }
}
